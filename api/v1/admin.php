<?php

use Ampersand\Misc\Config;
use Ampersand\Log\Logger;
use Ampersand\Log\Notifications;
use Ampersand\Rule\Conjunct;
use Ampersand\Rule\Rule;
use Ampersand\Transaction;
use Ampersand\Rule\RuleEngine;
use Ampersand\IO\Exporter;
use Ampersand\IO\JSONWriter;
use Ampersand\IO\CSVWriter;
use Ampersand\IO\Importer;
use Ampersand\IO\JSONReader;
use Ampersand\IO\ExcelImporter;
use Ampersand\Misc\Reporter;
use Ampersand\Interfacing\Resource;
use Slim\Http\Request;
use Slim\Http\Response;
use Ampersand\Session;

/**
 * @var \Slim\App $api
 */
global $api;

/**
 * @phan-closure-scope \Slim\App
 */
$api->group('/admin', function () {
    // Inside group closure, $this is bound to the instance of Slim\App
    /** @var \Slim\App $this */

    $this->get('/sessions/delete/expired', function (Request $request, Response $response, $args = []) {
        if (Config::get('productionEnv')) {
            throw new Exception("Not allowed in production environment", 403);
        }
        
        $transaction = Transaction::getCurrentTransaction();

        Session::deleteExpiredSessions();

        $transaction->runExecEngine()->close();
    });
    
    $this->post('/resource/{resourceType}/rename', function (Request $request, Response $response, $args = []) {
        if (Config::get('productionEnv')) {
            throw new Exception("Not allowed in production environment", 403);
        }
        $resourceType = $args['resourceType'];
        
        $list = $request->reparseBody()->getParsedBody();
        if (!is_array($list)) {
            throw new Exception("Body must be array. Non-array provided", 500);
        }

        $transaction = Transaction::getCurrentTransaction();

        foreach ($list as $item) {
            $resource = Resource::makeResource($item->oldId, $resourceType);
            $resource->rename($item->newId);
        }
        
        $transaction->runExecEngine()->close();

        return $response->withJson($list, 200, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    });

    $this->get('/installer', function (Request $request, Response $response, $args = []) {
        /** @var \Slim\Container $this */
        /** @var \Ampersand\AmpersandApp $ampersandApp */
        $ampersandApp = $this['ampersand_app'];

        if (Config::get('productionEnv')) {
            throw new Exception("Reinstallation of application not allowed in production environment", 403);
        }
        
        $defaultPop = filter_var($request->getQueryParam('defaultPop', true), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        if (is_null($defaultPop)) {
            $defaultPop = true;
        }

        $ampersandApp->reinstall($defaultPop); // Reinstall application

        $ampersandApp->checkProcessRules(); // Check all process rules that are relevant for the activate roles

        $content = Notifications::getAll(); // Return all notifications

        return $response->withJson($content, 200, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    });

    $this->get('/installer/checksum/update', function (Request $request, Response $response, $args = []) {
        /** @var \Slim\Container $this */
        /** @var \Ampersand\AmpersandApp $ampersandApp */
        $ampersandApp = $this['ampersand_app'];

        if (Config::get('productionEnv')) {
            throw new Exception("Checksum update is not allowed in production environment", 403);
        }

        $ampersandApp->getModel()->writeChecksumFile();
        
        Logger::getUserLogger()->info('New checksum calculated for generated Ampersand model files');

        $content = Notifications::getAll(); // Return all notifications

        return $response->withJson($content, 200, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    });

    $this->get('/execengine/run', function (Request $request, Response $response, $args = []) {
        /** @var \Ampersand\AmpersandApp $ampersandApp */
        $ampersandApp = $this['ampersand_app'];

        // Check for required role
        if (!$ampersandApp->hasRole(Config::get('allowedRolesForRunFunction', 'execEngine'))) {
            throw new Exception("You do not have access to run the exec engine", 403);
        }
            
        \Ampersand\Rule\ExecEngine::run();
        
        $transaction = Transaction::getCurrentTransaction()->close();
        if ($transaction->isCommitted()) {
            Logger::getUserLogger()->notice("Run completed");
        } else {
            Logger::getUserLogger()->warning("Run completed but transaction not committed");
        }

        $ampersandApp->checkProcessRules(); // Check all process rules that are relevant for the activate roles
        
        return $response->withJson(Notifications::getAll(), 200, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    });

    $this->get('/ruleengine/evaluate/all', function (Request $request, Response $response, $args = []) {
        if (Config::get('productionEnv')) {
            throw new Exception("Evaluation of all rules not allowed in production environment", 403);
        }

        foreach (Conjunct::getAllConjuncts() as $conj) {
            /** @var \Ampersand\Rule\Conjunct $conj */
            $conj->evaluate()->persistCacheItem();
        }
        
        foreach (RuleEngine::getViolations(Rule::getAllInvRules()) as $violation) {
            Notifications::addInvariant($violation);
        }
        foreach (RuleEngine::getViolations(Rule::getAllSigRules()) as $violation) {
            Notifications::addSignal($violation);
        }
        
        return $response->withJson(Notifications::getAll(), 200, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    });

    $this->get('/export/all', function (Request $request, Response $response, $args = []) {
        if (Config::get('productionEnv')) {
            throw new Exception("Export not allowed in production environment", 403);
        }
        
        // Export population to response body
        $exporter = new Exporter(new JSONWriter($response->getBody()), Logger::getLogger('IO'));
        $exporter->exportAllPopulation();

        // Return response
        $filename = Config::get('contextName') . "_Population_" . date('Y-m-d\TH-i-s') . ".json";
        return $response->withHeader('Content-Disposition', "attachment; filename={$filename}")
                        ->withHeader('Content-Type', 'application/json;charset=utf-8');
    });

    $this->post('/import', function (Request $request, Response $response, $args = []) {
        /** @var \Ampersand\AmpersandApp $ampersandApp */
        $ampersandApp = $this['ampersand_app'];

        /** @var \Ampersand\AngularApp $angularApp */
        $angularApp = $this['angular_app'];
        
        // Check for required role
        if (!$ampersandApp->hasRole(Config::get('allowedRolesForImporter'))) {
            throw new Exception("You do not have access to import population", 403);
        }
        
        if (is_uploaded_file($_FILES['file']['tmp_name'])) {
            $extension = pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION);
            switch ($extension) {
                case 'json':
                    $reader = new JSONReader();
                    $reader->loadFile($_FILES['file']['tmp_name']);
                    $importer = new Importer($reader, Logger::getLogger('IO'));
                    $importer->importPopulation();
                    break;
                case 'xls':
                case 'xlsx':
                case 'ods':
                    $importer = new ExcelImporter(Logger::getLogger('IO'));
                    $importer->parseFile($_FILES['file']['tmp_name']);
                    break;
                default:
                    throw new Exception("Unsupported file extension", 400);
                    break;
            }

            // Commit transaction
            $transaction = Transaction::getCurrentTransaction()->runExecEngine()->close();
            if ($transaction->isCommitted()) {
                Logger::getUserLogger()->notice("Imported {$_FILES['file']['name']} successfully");
            }
            unlink($_FILES['file']['tmp_name']);
        } else {
            Logger::getUserLogger()->error("No file uploaded");
        }
        
        // Check all process rules that are relevant for the activate roles
        $ampersandApp->checkProcessRules();
        $content = ['notifications' => Notifications::getAll(),
                    'files' => $_FILES,
                    'sessionRefreshAdvice' => $angularApp->getSessionRefreshAdvice()
                    ];
        return $response->withJson($content, 200, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    });
})->add($middleWare1);

/**
 * @phan-closure-scope \Slim\App
 */
$api->group('/admin/report', function () {
    // Inside group closure, $this is bound to the instance of Slim\App
    /** @var \Slim\App $this */

    $this->get('/relations', function (Request $request, Response $response, $args = []) {
        if (Config::get('productionEnv')) {
            throw new Exception("Reports are not allowed in production environment", 403);
        }

        // Get report
        $reporter = new Reporter(new JSONWriter($response->getBody()));
        $reporter->reportRelationDefinitions();

        // Return reponse
        return $response->withHeader('Content-Type', 'application/json;charset=utf-8');
    });

    $this->get('/conjuncts/usage', function (Request $request, Response $response, $args = []) {
        if (Config::get('productionEnv')) {
            throw new Exception("Reports are not allowed in production environment", 403);
        }

        // Get report
        $reporter = new Reporter(new JSONWriter($response->getBody()));
        $reporter->reportConjunctUsage();

        // Return reponse
        return $response->withHeader('Content-Type', 'application/json;charset=utf-8');
    });

    $this->get('/conjuncts/performance', function (Request $request, Response $response, $args = []) {
        if (Config::get('productionEnv')) {
            throw new Exception("Reports are not allowed in production environment", 403);
        }

        // Get report
        $reporter = new Reporter(new CSVWriter($response->getBody()));
        $reporter->reportConjunctPerformance(Conjunct::getAllConjuncts());
        
        // Set response headers
        $filename = Config::get('contextName') . "_Conjunct performance_" . date('Y-m-d\TH-i-s') . ".csv";
        return $response->withHeader('Content-Disposition', "attachment; filename={$filename}")
                        ->withHeader('Content-Type', 'text/csv; charset=utf-8');
    });

    $this->get('/interfaces', function (Request $request, Response $response, $args = []) {
        if (Config::get('productionEnv')) {
            throw new Exception("Reports are not allowed in production environment", 403);
        }

        // Get report
        $reporter = new Reporter(new CSVWriter($response->getBody()));
        $reporter->reportInterfaceDefinitions();

        // Set response headers
        $filename = Config::get('contextName') . "_Interface definitions_" . date('Y-m-d\TH-i-s') . ".csv";
        return $response->withHeader('Content-Disposition', "attachment; filename={$filename}")
                        ->withHeader('Content-Type', 'text/csv; charset=utf-8');
    });

    $this->get('/interfaces/issues', function (Request $request, Response $response, $args = []) {
        if (Config::get('productionEnv')) {
            throw new Exception("Reports are not allowed in production environment", 403);
        }

        // Get report
        $reporter = new Reporter(new CSVWriter($response->getBody()));
        $reporter->reportInterfaceIssues();

        // Set response headers
        $filename = Config::get('contextName') . "_Interface issues_" . date('Y-m-d\TH-i-s') . ".csv";
        return $response->withHeader('Content-Disposition', "attachment; filename={$filename}")
                        ->withHeader('Content-Type', 'text/csv; charset=utf-8');
    });
})->add($middleWare1);
