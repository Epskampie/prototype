import { Component, Input, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { BaseAtomicComponent } from '../BaseAtomicComponent.class';
import { Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import { InterfaceRefObject, ObjectBase } from '../../objectBase.interface';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-atomic-object',
  templateUrl: './atomic-object.component.html',
  styleUrls: ['./atomic-object.component.scss'],
})
export class AtomicObjectComponent extends BaseAtomicComponent<ObjectBase> implements OnInit {
  public menuItems: { [index: string]: Array<MenuItem> } = {};
  public alternativeObjects$!: Observable<ObjectBase[]>;
  @Input()
  public placeholder!: string;
  newItemControl: FormControl<string> = new FormControl<string>('', { nonNullable: true, updateOn: 'change' });
  @Input() itemsMethod!: Function | null;

  constructor(private router: Router, private http: HttpClient /* required to make property 'itemsMethod' work  */) {
    super();
  }

  override ngOnInit(): void {
    super.ngOnInit();

    this.data.forEach((object) => {
      this.menuItems[object._id_] = this.toPrimeNgMenuModel(object._ifcs_, object._id_);
    });

    if (this.canUpdate()) {
      if (this.isUni && this.data.length > 0) return;
      this.alternativeObjects$ = this.getPatchItems()!;
    }

    this.newItemControl.valueChanges.subscribe((x: ObjectBase | string) => {
      if (x == '') return;
      const y = x as ObjectBase;

      return this.resource
        .patch([
          {
            op: 'add',
            path: this.propertyName,
            value: y._id_,
          },
        ])
        .subscribe(() => {
          this.newItemControl.setValue('');
          for (const item of this.data) {
            if (item._id_ == y._id_) return;
          }
          this.data.push(x as ObjectBase);
        });
    });
  }

  getPatchItems(): Observable<ObjectBase[]> | null {
    if (this.itemsMethod == null) return null;
    return this.itemsMethod();
  }

  public remove(object: ObjectBase) {
    return this.resource
      .patch([
        {
          op: 'remove',
          path: `${this.propertyName}/${object._id_}`,
        },
      ])
      .subscribe(() => {
        this.newItemControl.setValue('');
        for (const item of this.data) {
          if (item._id_ == object._id_) return;
          const index = this.data.indexOf(object, 0);
          if (index > -1) {
            this.data.splice(index, 1);
          }
        }
      });
  }

  public destroy(fieldName: string, object: ObjectBase) {
    //TODO connect to delete request
  }

  public navigateToEntity(type: string, id: string) {
    this.router.navigate(['p', type.toLowerCase(), `${id}`]);
  }

  public toPrimeNgMenuModel(ifcs: Array<InterfaceRefObject>, id: string): Array<MenuItem> {
    return ifcs.map(
      (ifc) =>
        <MenuItem>{
          label: ifc.label,
          icon: 'pi pi-refresh',
          command: () => this.navigateToEntity(ifc.id, id),
        },
    );
  }
}
