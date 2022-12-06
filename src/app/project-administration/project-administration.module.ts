import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActiveProjectsComponent } from './active-projects/active-projects.component';
import { InactiveProjectsComponent } from './inactive-projects/inactive-projects.component';
import { SharedModule } from '../shared/shared.module';
import { ProjectComponent } from './project/project.component';
import { PersonComponent } from './person/person.component';
import { PeopleComponent } from './people/people.component';
import { BackendService } from './backend.service';
import { BackendMockService } from './backend.mock.service';
import { RouterModule, Routes } from '@angular/router';
import { AppLayoutComponent } from '../layout/app.layout.component';
import { MenuItem } from 'primeng/api';

const routes: Routes = [
  {
    path: 'p',
    component: AppLayoutComponent,
    children: [
      { path: 'active-projects', component: ActiveProjectsComponent },
      { path: 'inactive-projects', component: InactiveProjectsComponent },
      { path: 'project', component: ProjectComponent },
      { path: 'project/:id', component: ProjectComponent },
      { path: 'people', component: PeopleComponent },
      { path: 'person/:id', component: PersonComponent },
      { path: 'person', component: PersonComponent },
    ],
  },
];

export const menuItems: MenuItem[] = [
  {
    label: 'Project administration',
    items: [
      {
        label: 'Active projects',
        icon: 'pi pi-fw pi-bars',
        routerLink: ['/p/active-projects'],
      },
      {
        label: 'Inactive projects',
        icon: 'pi pi-fw pi-bars',
        routerLink: ['/p/inactive-projects'],
      },
      {
        label: 'Project details',
        icon: 'pi pi-fw pi-id-card',
        routerLink: ['/p/project'],
      },
      {
        label: 'People',
        icon: 'pi pi-fw pi-bars',
        routerLink: ['/p/people'],
      },
      {
        label: 'Person details',
        icon: 'pi pi-fw pi-id-card',
        routerLink: ['/p/person'],
      },
    ],
  },
];

@NgModule({
  declarations: [ActiveProjectsComponent, InactiveProjectsComponent, ProjectComponent, PersonComponent, PeopleComponent],
  imports: [CommonModule, SharedModule, RouterModule.forChild(routes)],
  providers: [{ provide: BackendService, useClass: BackendService }],
})
export class ProjectAdministrationModule {}
