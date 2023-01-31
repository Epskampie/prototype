import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AmpersandInterface } from 'src/app/shared/interfacing/ampersand-interface.class';
import { BackendService } from '../backend.service';
import { PeopleInterface } from './people.interface';

@Component({
  selector: 'app-persons',
  templateUrl: './people.component.html',
  styleUrls: ['./people.component.scss'],
})
export class PeopleComponent extends AmpersandInterface<PeopleInterface> implements OnInit {
  data$!: Observable<PeopleInterface[]>;

  constructor(private service: BackendService, private router: Router) {
    super();
  }

  ngOnInit(): void {
    this.data$ = this.service.getPeople();
  }

  public newPerson(): void {
    const newPersonId = this.service.postPerson();
    newPersonId.subscribe((person) => {
      this.router.navigate(['p', 'person', `${person._id_}`]);
    });
  }
}
