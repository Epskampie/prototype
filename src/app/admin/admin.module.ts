import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InstallerComponent } from './installer/installer.component';
import { RouterModule, Routes } from '@angular/router';
import { AppLayoutComponent } from '../layout/app.layout.component';

const routes: Routes = [
  {
    path: 'admin',
    component: AppLayoutComponent,
    children: [{ path: 'installer', component: InstallerComponent }],
  },
];

export const menuItems: any[] = [
  {
    label: 'Admin',
    items: [{ label: 'Installer', icon: 'pi pi-fw pi-replay', routerLink: ['/admin/installer'] }],
  },
];

@NgModule({
  declarations: [InstallerComponent],
  imports: [CommonModule, RouterModule.forRoot(routes)],
})
export class AdminModule {}
