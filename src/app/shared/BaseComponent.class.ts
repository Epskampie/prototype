import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';

@Component({
  template: '',
})
export abstract class BaseComponent implements OnInit, OnChanges {
  public canCreate: boolean = true;
  public canRead: boolean = true;
  public canUpdate: boolean = true;
  public canDelete: boolean = true;
  public _isUni: boolean = false;
  @Input()
  set isUni(attribute: boolean | '') {
    this._isUni = attribute === '' || attribute;
  }
  get isUni(): boolean {
    return this._isUni;
  }
  public _isTot: boolean = false;
  @Input()
  set isTot(attribute: boolean | '') {
    this._isTot = attribute === '' || attribute;
  }
  get isTot(): boolean {
    return this._isTot;
  }
  @Input() public crud: string = 'crud';

  ngOnInit(): void {
    this.setCRUDPermissions(this.crud);
  }

  // only used for the tools
  ngOnChanges(changes: SimpleChanges) {
    this.setCRUDPermissions(changes['crud'].currentValue);
  }

  private setCRUDPermissions(crud: string) {
    let c = crud[0];
    let r = crud[1];
    let u = crud[2];
    let d = crud[3];

    this.canCreate = c == c.toUpperCase();
    this.canRead = r == r.toUpperCase();
    this.canUpdate = u == u.toUpperCase();
    this.canDelete = d == d.toUpperCase();
  }

  public requireArray(property: any) {
    if (Array.isArray(property)) {
      return property;
    } else if (property === null) {
      return [];
    } else {
      return [property];
    }
  }
}
