<?php

/*
 * This file is part of the Ampersand backend framework.
 *
 */

namespace Ampersand\Interfacing;

use Exception;
use Ampersand\AmpersandApp;
use Ampersand\AngularApp;
use Ampersand\Interfacing\Resource;
use Ampersand\Log\Notifications;
use function Ampersand\Misc\getSafeFileName;

class InterfaceController
{

    /**
     * Reference to the ampersand backend instance
     *
     * @var \Ampersand\AmpersandApp
     */
    protected $ampersandApp;

    /**
     * Reference to the frontend instance
     *
     * @var \Ampersand\AngularApp
     */
    protected $angularApp;

    /**
     * Constructor
     *
     * @param \Ampersand\AmpersandApp $ampersandApp
     * @param \Ampersand\AngularApp $angularApp
     */
    public function __construct(AmpersandApp $ampersandApp, AngularApp $angularApp)
    {
        $this->ampersandApp = $ampersandApp;
        $this->angularApp = $angularApp;
    }

    public function get(Resource $resource, $ifcPath, int $options, $depth)
    {
        return $resource->walkPath($ifcPath)->get($options, $depth);
    }

    public function put(Resource $resource, $ifcPath, $body, $options, $depth): array
    {
        $transaction = $this->ampersandApp->newTransaction();
        
        // Perform put
        $resource = $resource->walkPathToResource($ifcPath)->put($body);
        
        // Run ExecEngine
        $transaction->runExecEngine();

        // Get content to return
        try {
            $content = $resource->get($options, $depth);
        } catch (Exception $e) { // e.g. when read is not allowed
            $content = $body;
        }

        // Close transaction
        $transaction->close();
        if ($transaction->isCommitted()) {
            $this->ampersandApp->userLog()->notice($resource->getLabel() . " updated");
        }
        
        $this->ampersandApp->checkProcessRules(); // Check all process rules that are relevant for the activate roles

        // Return result
        return [ 'content'               => $content
               , 'notifications'         => Notifications::getAll()
               , 'invariantRulesHold'    => $transaction->invariantRulesHold()
               , 'isCommitted'           => $transaction->isCommitted()
               , 'sessionRefreshAdvice'  => $this->angularApp->getSessionRefreshAdvice()
               , 'navTo'                 => $this->angularApp->getNavToResponse($transaction->isCommitted() ? 'COMMIT' : 'ROLLBACK')
               ];
    }

    /**
     * Patch resource with provided patches
     * Use JSONPatch specification for $patches (see: http://jsonpatch.com/)
     *
     * @param \Ampersand\Interfacing\Resource $resource
     * @param string|array $ifcPath
     * @param array $patches
     * @param int $options
     * @param int|null $depth
     * @return array
     */
    public function patch(Resource $resource, $ifcPath, array $patches, int $options, int $depth = null): array
    {
        $transaction = $this->ampersandApp->newTransaction();
        
        // Perform patch(es)
        $resource = $resource->walkPathToResource($ifcPath)->patch($patches);

        // Run ExecEngine
        $transaction->runExecEngine();

        // Get content to return
        try {
            $content = $resource->get($options, $depth);
        } catch (Exception $e) { // e.g. when read is not allowed
            $content = null;
        }

        // Close transaction
        $transaction->close();
        if ($transaction->isCommitted()) {
            $this->ampersandApp->userLog()->notice($resource->getLabel() . " updated");
        }
        
        $this->ampersandApp->checkProcessRules(); // Check all process rules that are relevant for the activate roles
    
        // Return result
        return [ 'patches'               => $patches
               , 'content'               => $content
               , 'notifications'         => Notifications::getAll()
               , 'invariantRulesHold'    => $transaction->invariantRulesHold()
               , 'isCommitted'           => $transaction->isCommitted()
               , 'sessionRefreshAdvice'  => $this->angularApp->getSessionRefreshAdvice()
               , 'navTo'                 => $this->angularApp->getNavToResponse($transaction->isCommitted() ? 'COMMIT' : 'ROLLBACK')
               ];
    }

    public function post(Resource $resource, $ifcPath, $body, $options, $depth): array
    {
        $transaction = $this->ampersandApp->newTransaction();
        
        $list = $resource->walkPathToResourceList($ifcPath);

        // Special case for file upload
        if ($list->getIfc()->tgtConcept->isFileObject()) {
            if (is_uploaded_file($_FILES['file']['tmp_name'])) {
                $resource = $list->post((object) []);

                $tmp_name = $_FILES['file']['tmp_name'];
                $originalFileName = $_FILES['file']['name'];

                $appAbsolutePath = $this->ampersandApp->getSettings()->get('global.absolutePath');
                $uploadFolder = $this->ampersandApp->getSettings()->get('global.uploadPath');
                $dest = getSafeFileName($appAbsolutePath . DIRECTORY_SEPARATOR . $uploadFolder . DIRECTORY_SEPARATOR . $originalFileName);
                $relativePath = $uploadFolder . '/' . pathinfo($dest, PATHINFO_BASENAME); // use forward slash as this is used on the web
                
                $result = move_uploaded_file($tmp_name, $dest);
                
                if (!$result) {
                    throw new Exception("Error in file upload", 500);
                }
                
                // Populate filePath and originalFileName relations in database
                $resource->link($relativePath, 'filePath[FileObject*FilePath]')->add();
                $resource->link($originalFileName, 'originalFileName[FileObject*FileName]')->add();
            } else {
                throw new Exception("No file uploaded", 500);
            }
        } else {
            // Perform create
            $resource = $list->post($body);
        }

        // Run ExecEngine
        $transaction->runExecEngine();

        // Get content to return
        try {
            $content = $resource->get($options, $depth);
        } catch (Exception $e) { // e.g. when read is not allowed
            $content = $body;
        }

        // Close transaction
        $transaction->close();
        if ($transaction->isCommitted()) {
            if ($result) {
                $this->ampersandApp->userLog()->notice("File '{$originalFileName}' uploaded");
            } else {
                $this->ampersandApp->userLog()->notice($resource->getLabel() . " created");
            }
        } else {
            // TODO: remove uploaded file
        }
        
        $this->ampersandApp->checkProcessRules(); // Check all process rules that are relevant for the activate roles
    
        // Return result
        return [ 'content'               => $content
               , 'notifications'         => Notifications::getAll()
               , 'invariantRulesHold'    => $transaction->invariantRulesHold()
               , 'isCommitted'           => $transaction->isCommitted()
               , 'sessionRefreshAdvice'  => $this->angularApp->getSessionRefreshAdvice()
               , 'navTo'                 => $this->angularApp->getNavToResponse($transaction->isCommitted() ? 'COMMIT' : 'ROLLBACK')
               ];
    }

    /**
     * Delete a resource given an entry resource and a path
     *
     * @param \Ampersand\Interfacing\Resource $resource
     * @param string|array $ifcPath
     * @return array
     */
    public function delete(Resource $resource, $ifcPath): array
    {
        $transaction = $this->ampersandApp->newTransaction();
        
        // Perform delete
        $resource->walkPathToResource($ifcPath)->delete();
        
        // Close transaction
        $transaction->runExecEngine()->close();
        if ($transaction->isCommitted()) {
            $this->ampersandApp->userLog()->notice("Resource deleted");
        }
        
        $this->ampersandApp->checkProcessRules(); // Check all process rules that are relevant for the activate roles
        
        // Return result
        return [ 'notifications'         => Notifications::getAll()
               , 'invariantRulesHold'    => $transaction->invariantRulesHold()
               , 'isCommitted'           => $transaction->isCommitted()
               , 'sessionRefreshAdvice'  => $this->angularApp->getSessionRefreshAdvice()
               , 'navTo'                 => $this->angularApp->getNavToResponse($transaction->isCommitted() ? 'COMMIT' : 'ROLLBACK')
               ];
    }
}
