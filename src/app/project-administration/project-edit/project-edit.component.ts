import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { Observable, switchMap, tap } from 'rxjs';
import { AmpersandInterface } from 'src/app/shared/interfacing/ampersand-interface.class';
import { BackendService } from '../backend.service';
import { ProjectEditInterface } from './project-edit.interface';

@Component({
  selector: 'app-project-edit',
  templateUrl: './project-edit.component.html',
  styleUrls: ['./project-edit.component.scss'],
})
export class ProjectEditComponent extends AmpersandInterface<ProjectEditInterface> implements OnInit {
  public data$!: Observable<ProjectEditInterface>;
  public projectId!: string;
  constructor(private route: ActivatedRoute, public service: BackendService) {
    super();
  }

  ngOnInit(): void {
    this.data$ = this.route.paramMap.pipe(
      switchMap((params: ParamMap) => {
        this.projectId = params.get('id')!;
        if (this.projectId === null) {
          throw new Error('id does not exist');
        }
        return this.service.getProjectEdit(this.projectId);
      }),
    );
  }
}
