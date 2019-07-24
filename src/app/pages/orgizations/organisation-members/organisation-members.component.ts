import { Observable } from 'rxjs/Observable';
import { HttpClient } from '@angular/common/http';
import { ApiService } from './../../../services/api.service';
import { Component, OnInit, Input, Output } from '@angular/core';
import { NbAuthService } from '@nebular/auth';
import { NbAccessChecker } from '@nebular/security';
import { Router, ActivatedRouteSnapshot, ActivatedRoute } from '@angular/router';
import { OrganisationsForm } from '../../../models/add-edit-organisations';
import { Member } from '../../../models/add-edit-organisation-members';
import { DomSanitizer } from '@angular/platform-browser';
import { map, filter } from 'rxjs/operators';
import { LocalDataSource } from 'ng2-smart-table';
import { forEach } from '@angular/router/src/utils/collection';

@Component({
  selector: 'ngx-organisation-members',
  templateUrl: './organisation-members.component.html',
  styleUrls: ['./organisation-members.component.scss'],
})
export class OrganisationMembersComponent implements OnInit {
  memberCount: number = 0;
  members: Array<Member>[] = [];
  FormOrgMembers: Array<OrganisationsForm>[] = [];
  goForm: boolean = false;
  isAdd: boolean = false;
  isEdit: boolean = false;
  isAdmin: boolean = false;
  orgId;
  mainPerson: Array<Member>[] = [];
  uuidOrg;
  avaiabledEmail: boolean = false;
  avaiabledUser: boolean = false;
  org = {};
  source: LocalDataSource = new LocalDataSource();
  statusAdmin: boolean = false;
  settings = {
    mode: 'external',
    add: {
      addButtonContent: '<i class="nb-plus"></i>',
    },
    actions: {
      columnTitle: 'Actions',
      add: true,
      edit: false,
      delete: false,
      custom: [
        {
          name: 'Edit',
          title: '<i class="custom-edit nb-edit"></i>',
        },
        {
          name: 'Delete',
          title: '<i class="custom-delete nb-trash"></i>',
        },
        {
          name: 'Admin',
          title: `
            <i class="custom-admin-disable cursor-pointer  nb-power"></i>
          `,
        },
      ],
    },
    /* edit: {
      editButtonContent: '<i class="nb-edit"></i>',
      saveButtonContent: '<i class="nb-checkmark"></i>',
      cancelButtonContent: '<i class="nb-close"></i>',
    },
    delete: {
      deleteButtonContent: '<i class="nb-trash"></i>',
    }, */
    columns: {
      name: {
        title: 'Name',
        type: 'string',

      },
      dob: {
        title: 'D.O.B',
        type: 'string',
      },
      email: {
        title: 'Email',
        type: 'string',

      },
      jobTitle: {
        title: 'Job',
        type: 'string',
      },
      nric: {
        title: 'NRIC/ID Number',
        type: 'string',
      },
      phone: {
        title: 'Phone Number',
        type: 'string',
      },
      admin: {
        name: 'Admin',
        title: 'Administrator',
        type: 'html',
        filter: false,
        valuePrepareFunction: (cell, rows) => {
          return `
            <div class="ng-star-inserted admin-custom">
              <a class="display-5">
                <i class="${cell === true ? 'nb-checkmark-circle custom-admin-active' : ''}"></i>
              </a>
            </div>
          `;
        },
      },
    },
    pager: {
      perPage: 20,
    },
  };
  // tslint:disable-next-line: max-line-length
  constructor(public _sanitizer: DomSanitizer, public apiService: ApiService, public routes: ActivatedRoute, public http: HttpClient, public authService: NbAuthService, public accessChecker: NbAccessChecker, public router: Router) {
  }

  ngOnInit() {
    this.getMembers();
    this.getOrganisation();

  }


  getOrganisation() {
    const idOrgani = +this.routes.snapshot.params.id;
    this.apiService.getOrganisations(`/${idOrgani}`)
      .subscribe(res => {
        this.org = res;
        this.uuidOrg = res['uuid'];
      });
  }

  getMembers() {
    const id = this.routes.snapshot.params.id;
    this.apiService.getOrganisations(`/${id}/individual_members`)
      .subscribe(res => {
        this.members = res['hydra:member'];
        this.source.load(this.members);

        this.members.forEach((item, index) => {
          this.apiService.getPersonByUuid(item['personData']['uuid'])
            .pipe(
              filter(n => n['hydra:member'][0]),
              map(n => n['hydra:member'][0]),
            ).subscribe(response => {
              this.apiService.getUser(`?uuid=${response['userUuid']}`)
                .pipe(
                  filter(n => n['hydra:member'][0]),
                  map(n => n['hydra:member'][0]),
                ).subscribe(responseUser => {
                  item['username'] = responseUser['username'];
                  item['idUser'] = responseUser['@id'];
                }, null, () => {
                  if (this.memberCount === this.members.length) {
                    this.source.refresh();
                    this.memberCount = 0;
                  }
                });

              item['email'] = response['email'];
              item['dob'] = response['birthDate'];
              item['nric'] = response['nationalities'][0]['nricNumber'];
              item['dob'] = new Date(response['birthDate']).toLocaleDateString();
              item['name'] = response['givenName'];
              item['phone'] = response['phoneNumber'];
              item['jobTitle'] = response['jobTitle'];

            }, null, () => {
              this.memberCount++;
              if (this.memberCount === this.members.length) {
                this.source.refresh();
                this.memberCount = 0;
              }
            });
          // tslint:disable-next-line: no-console
        });
      });
  }

  createMember(data, formUpload) {
    let bodyIndividual;
    // tslint:disable-next-line: no-console
    console.log(data);
    let mainDate;
    if (data['dob']) {
      mainDate = `${data['dob']['_i'][0]}-${data['dob']['_i'][1]}-${data['dob']['_i'][2]}`.toLocaleString();
    }
    const body = {
      'birthDate': (mainDate) ? mainDate : null,
      'jobTitle': (data['jobTitle']) ? data['jobTitle'] : null,
      'givenName': (data['name']) ? data['name'] : '',
      'email': (data['email']) ? data['email'] : null,
      'phoneNumber': (data['phoneNumber']) ? data['phoneNumber'] : '',
      'userUuid': (data['userUuid']) ? data['userUuid'] : null,
      'nationalities': (data['nric']) ? [
        {
          'nricNumber': (data['nric']) ? data['nric'] : null,
        },
      ] : [],


    };
    this.apiService.createInfoMember(body)
      .subscribe(res => {
        // tslint:disable-next-line: no-console
        console.log(res);
        bodyIndividual = {
          'personUuid': res['uuid'],
          'organisationUuid': this.uuidOrg,
          'admin': (this.isAdmin === true) ? true : false,
        };

      }, err => {
        if (err.status === 404) {
          alert('You can’t create a Member right now. Try check your field.');
        } else if (err.status === 400) {
          alert('You can’t create a Member right now. Try check your field.');
        } else if (err.status === 500) {
          alert('Server error.!!!');
        }
      }, () => {
        this.apiService.createMember(bodyIndividual)
          .subscribe(response => {
            console.log('individual member', response)
            console.log('form upload',data);
            this.isAdmin = false;
            this.FormOrgMembers = [];
            this.getMembers();
          }, err => {
            if (err.status === 404) {
              alert('You can’t create a Member right now. Try again later.');
            } else if (err.status === 400) {
              alert('You can’t create a Member right now. Try check your field.');
            } else if (err.status === 500) {
              alert('Server error.!!!');
            }

          });
      });

    /* /.Submit */
  }

  createMemberSubmit(dataInput) {
    dataInput['logoName'] = (<HTMLInputElement>document.getElementById("logo")).files[0];
    dataInput['logoFile'] = (<HTMLInputElement>document.getElementById("logo")).files[0];
    let dob;
    if (dataInput['dob']) {
      dob = `${dataInput['dob']['_i'][0]}-0${dataInput['dob']['_i'][1]}-${dataInput['dob']['_i'][2]}`.toLocaleString();
    }
    const bodyUser = {
      'pictureName': dataInput['logoName'].name,
      'email': (dataInput['email']) ? dataInput['email'] : null,
      'plainPassword': (dataInput['userPassword']) ? dataInput['userPassword'] : null,
      'username': (dataInput['userName']) ? dataInput['userName'] : null,
      'phone': (dataInput['phoneNumber']) ? dataInput['phoneNumber'] : null,
      'birhDate': (dob) ? dob : null,
    };
    this.apiService.createUser(bodyUser)
      .subscribe(res => {

        dataInput['userUuid'] = res['uuid'];
        console.log(res)
        /* let attributes = res['logoWriteForm']['attributes'];
        let inputs = res['logoWriteForm']['inputs'];
        let formLogoWrite = new FormData;
        formLogoWrite.append('Policy', inputs['Policy']);
        formLogoWrite.append('X-Amz-Algorithm', inputs['X-Amz-Algorithm']);
        formLogoWrite.append('X-Amz-Credential', inputs['X-Amz-Credential']);
        formLogoWrite.append('X-Amz-Date', inputs['X-Amz-Date']);
        formLogoWrite.append('X-Amz-Signature', inputs['X-Amz-Signature']);
        formLogoWrite.append('acl', inputs['acl']);
        formLogoWrite.append('key', res['logoWriteForm']['filePath']);
        formLogoWrite.append('file', dataInput['logoFile']) */
        // if (dataInput['logoFile']) {
        //   this.apiService.uploadImage(attributes['action'], formLogoWrite)
        //     .subscribe(res => {

        //     })
        // }
        this.createMember(dataInput, res);
      }, err => {
        let FilterapiUsername;
        let FilterapiEmail;
        if (err.status === 404) {
          alert('You can’t create a Member right now. Try again later.');
        } else if (err.status === 400) {
          alert('You can’t create a Member right now. Try check your field.');
        }

        this.apiService.getUser(`?username=${dataInput['userName']}`)
          .subscribe(userCallback => {
            if (userCallback['hydra:member'][0]) {
              FilterapiUsername = userCallback['hydra:member'][0]['userName'];
              alert(`The username ${dataInput['userName']} already exists. Please use a different username.`);
            }
          }, error => {
            if (error.status === 400) {
              alert(error.error['hydra:description']);
              return false;
            } else if (error.status === 404) {
              alert(error.error['hydra:description']);
              return false;
            } else if (error.status === 500) {
              alert(error.error['hydra:description']);
              return false;
            }
          });
        this.apiService.getUser(`?email=${dataInput['email']}`)
          .subscribe(emailCallback => {
            if (emailCallback['hydra:member'][0]) {
              FilterapiEmail = emailCallback['hydra:member'][0]['email'];
              alert(`The email ${dataInput['email']} already exists. Please use a different username.`);
            } else {
              this.avaiabledEmail = false;
            }
          }, error => {
            if (error.status === 400) {
              alert(error.error['hydra:description']);
              return false;
            } else if (error.status === 403) {
              alert(error.error['hydra:description']);
              return false;
            } else if (error.status === 500) {
              alert(error.error['hydra:description']);
              return false;
            }
          });
      });
  }

  editMemberSubmit(data) {
    // tslint:disable-next-line: no-console
    let mainDate;
    if (data['dob']) {
      mainDate = `${data['dob']['_i'][0]}-${data['dob']['_i'][1]}-${data['dob']['_i'][2]}`.toLocaleString();
    }
    let id = data['id'];
    id = id.match(/\d+/g).map(Number);
    const body = {
      'birthDate': (mainDate) ? mainDate : data['dobPlaceholder'],
      'givenName': (data['name']) ? data['name'] : data['name'],
      'jobTitle': (data['jobTitle']) ? data['jobTitle'] : data['jobTitle'],
      'email': (data['email']) ? data['email'] : data['email'],
      'phoneNumber': (data['phoneNumber']) ? data['phoneNumber'] : data['phoneNumber'],
      'nationalities': (data['nric']) ? [
        {
          'nricNumber': data['nric'],
        },
      ] : [],
    };
    this.apiService.EditInfoMember(body, id)
      .subscribe(res => {
        this.FormOrgMembers = [];
        this.goForm = false;
        this.isEdit = false;

      }, err => {
        if (err.status === 404) {
          alert('You can’t edit a Member right now. Try check your field.');
        } else if (err.status === 400) {
          alert('You can’t edit a Member right now. Try check your field.');
        } else if (err.status === 500) {
          alert('Server error.!!!');
        }

      });
  }
  EditUser(dataInput) {
    let dob;
    // tslint:disable-next-line: no-console
    if (window.confirm('Are you sure you want to edit?')) {
      if (!this.avaiabledEmail && !this.avaiabledUser) {
        if (dataInput['dob']) {
          // tslint:disable-next-line: max-line-length
          dob = `${dataInput['dob']['_i'][0]}-0${dataInput['dob']['_i'][1]}-${dataInput['dob']['_i'][2]}`.toLocaleString();
        }
        const editBodyUser = {
          'email': (dataInput['email']) ? dataInput['email'] : '',
          'jobTitle': (dataInput['jobTitle']) ? dataInput['jobTitle'] : '',
          'plainPassword': (dataInput['userPassword']) ? dataInput['userPassword'] : '',
          'username': (dataInput['userName']) ? dataInput['userName'] : '',
          'phone': (dataInput['phoneNumber']) ? dataInput['phoneNumber'] : '',
          'birthDate': (dataInput['dob']) ? dob : dataInput['dobPlaceholder'],
        };
        let idUser = dataInput['idUser'];
        idUser = idUser.match(/\d+/g).map(Number);
        this.apiService.editUser(editBodyUser, idUser)
          .subscribe(res => {
            this.getMembers;
            this.FormOrgMembers = [];
            this.goForm = false;
            this.isEdit = false;

            // tslint:disable-next-line: no-console
            console.log(res);
          }, err => {
            let FilterapiUsername;
            let FilterapiEmail;
            if (err.status === 404) {
              alert(err.error['hydra:description']);
            } else if (err.status === 400) {
              alert(err.error['hydra:description']);
            } else if (err.status === 500) {
              alert(err.error['hydra:description']);
            }
          }, () => {
            this.getMembers();
            this.editMemberSubmit(dataInput);
          });
      }

    }

    // this.apiService.editUser(editBodyUser,)
  }

  clear() {
    this.goForm = false;
    this.isAdd = false;
    this.isEdit = false;
    this.isAdmin = false;
    this.FormOrgMembers = [];
  }
  create(event) {
    this.goForm = true;
    this.isAdd = true;
  }
  edit(event) {
    this.goForm = true;
    this.isEdit = true;
    console.log(event);
    this.FormOrgMembers['idUser'] = event.data['idUser'];
    this.FormOrgMembers['userName'] = event.data['username'];
    // console.log(responseUser)
    this.apiService.getPersonByUuid(event.data['personData']['uuid'])
      .pipe(
        filter(n => n['hydra:member'][0]),
        map(n => n['hydra:member'][0]),
      ).subscribe(response => {
        this.FormOrgMembers['id'] = response['@id'];
        // console.log(response);

      });
    this.FormOrgMembers['name'] = event.data['name'];
    this.FormOrgMembers['dobPlaceholder'] = event.data['dob'];
    this.FormOrgMembers['email'] = event.data['email'];
    this.FormOrgMembers['jobTitle'] = event.data['jobTitle'];
    this.FormOrgMembers['nric'] = event.data['nric'];
    this.FormOrgMembers['phoneNumber'] = event.data['phone'];

    // tslint:disable-next-line: no-console

  }
  deleteMememberSubmit(event) {
    if (window.confirm('Are you sure you want to delete?')) {
      /* personDelete */
      this.apiService.getPersonByUuid(event.data.personData.uuid)
        .subscribe(res => {
          if (res['hydra:member'][0]) {
            res['hydra:member'][0]['@id'] = res['hydra:member'][0]['@id'].match(/\d+/g).map(Number);
            this.apiService.DeletePerson(res['hydra:member'][0]['@id'])
              .subscribe(res => {
              }, err => {
                if (err.status === 404) {
                  alert(err.error['hydra:description']);
                } else if (err.status === 400) {
                  alert(err.error['hydra:description']);
                } else if (err.status === 500) {
                  alert(err.error['hydra:description']);
                }
              }, () => {
                let idDelete = event.data['@id'];
                let idUser = event.data['idUser'];
                if (idDelete && idUser) {
                  idUser = idUser.match(/\d+/g).map(Number);
                  idDelete = idDelete.match(/\d+/g).map(Number);
                  this.apiService.deleteIndividual(`/${idDelete}`)
                    .subscribe(res => {
                    }, err => {
                      if (err.status === 404) {
                        alert(err.error['hydra:description']);
                      } else if (err.status === 400) {
                        alert(err.error['hydra:description']);
                      } else if (err.status === 500) {
                        alert(err.error['hydra:description']);
                      }

                    }, () => {
                      this.getMembers();
                      this.apiService.deleteUser(`${idUser}`)
                        .subscribe(res => {
                          alert('successfully')
                        }, err => {
                          if (err.status === 404) {
                            alert(err.error['hydra:description']);
                          } else if (err.status === 400) {
                            alert(err.error['hydra:description']);
                          } else if (err.status === 500) {
                            alert("Member has been deleted but User has not been deleted.");
                          }

                        }, () => {
                        });
                    });
                } else {
                  return false;
                }

              })
          }
        }, err => {
          if (err.status === 404) {
            alert(err.error['hydra:description']);
          } else if (err.status === 400) {
            alert(err.error['hydra:description']);
          } else if (err.status === 500) {
            alert(err.error['hydra:description']);
          }
        });
      /* /.PersonDelete */


    }
  }

  setAdmin(event) {
    const setAdmin = {
      'personUuid': event.data['personData'].uuid,
      'organisationUuid': this.uuidOrg,
      'admin': !event.data['admin'],
    };


    this.apiService.setAdmin(setAdmin, event.data['@id'])
      .subscribe(res => {
      }, err => {
        if (err.status === 400) {
          alert(err.error['hydra:description']);
        } else if (err.status === 401) {
          alert(err.error['hydra:description']);
        } else if (err.status === 404) {
          alert(err.error['hydra:description']);
        } else if (err.status === 500) {
          alert(err.error['hydra:description']);
        }
      }, () => {
        return this.getMembers();
      });
  }

  customAction(event) {
    // tslint:disable-next-line: no-console
    if (event.action === 'Edit') {
      this.edit(event);
    } else if (event.action === 'Delete') {
      this.deleteMememberSubmit(event);
    } else if (event.action === 'Admin') {
      this.setAdmin(event);
    }
  }

  filter(dataInput, eventUser, eventEmail) {
    let FilterapiUsername;
    let FilterapiEmail;
    if (this.isAdd) {
      this.apiService.getUser(`?username=${dataInput['userName']}`)
        .subscribe(userCallback => {
          if (userCallback['hydra:member'][0]) {
            FilterapiUsername = userCallback['hydra:member'][0]['userName'];
            this.avaiabledUser = true;
          } else {
            this.avaiabledUser = false;
          }
        }, err => {
          if (err.status === 400) {
            alert(err.error['hydra:description']);
            return false;
          } else if (err.status === 403) {
            alert(err.error['hydra:description']);
            return false;
          } else if (err.status === 500) {
            alert(err.error['hydra:description']);
            return false;
          }
        });
      this.apiService.getUser(`?email=${dataInput['email']}`)
        .subscribe(emailCallback => {
          if (emailCallback['hydra:member'][0]) {
            this.avaiabledEmail = true;
            FilterapiEmail = emailCallback['hydra:member'][0]['email'];
          } else {
            this.avaiabledEmail = false;
          }
        }, err => {
          if (err.status === 400) {
            alert(err.error['hydra:description']);
            return false;
          } else if (err.status === 403) {
            alert(err.error['hydra:description']);
            return false;
          } else if (err.status === 500) {
            alert(err.error['hydra:description']);
            return false;
          }
        });
    }
    if (this.isEdit) {
      if (eventUser) {
        this.apiService.getUser(`?username=${eventUser}`)
          .subscribe(userCallback => {
            if (userCallback['hydra:member'][0]) {
              FilterapiUsername = userCallback['hydra:member'][0]['userName'];
              this.avaiabledUser = true;
            } else {
              this.avaiabledUser = false;
            }
          }, err => {
            if (err.status === 400) {
              alert(err.error['hydra:description']);
              return false;
            } else if (err.status === 403) {
              alert(err.error['hydra:description']);
              return false;
            } else if (err.status === 500) {
              alert(err.error['hydra:description']);
              return false;
            }
          });
      }
      if (eventEmail) {
        this.apiService.getUser(`?email=${eventEmail}`)
          .subscribe(emailCallback => {
            if (emailCallback['hydra:member'][0]) {
              this.avaiabledEmail = true;
              FilterapiEmail = emailCallback['hydra:member'][0]['email'];
            } else {
              this.avaiabledEmail = false;
            }
          }, err => {
            if (err.status === 400) {
              alert(err.error['hydra:description']);
              return false;
            } else if (err.status === 403) {
              alert(err.error['hydra:description']);
              return false;
            } else if (err.status === 500) {
              alert(err.error['hydra:description']);
              return false;
            }
          });
      }
    }
  }


}

