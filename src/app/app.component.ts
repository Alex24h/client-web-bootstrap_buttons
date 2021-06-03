import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UserInterfaceService } from './userInterface.service';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';

@Component({
  selector: 'app-root',
  template: `
    <img class="fullScreenImage" id="fullScreenImage" (click)="hideFullScreenImage()">
    <progress value='0' max='100' id='uploader'>0%</progress>
    <div class='menu'>
      <div style="width:320px;display:block;margin: 0 auto">
        <img src="./../assets/App icons/Perrinn_02.png" style="cursor:pointer;float:left;width:30px;margin:5px 45px 5px 5px;border-radius:3px;" (click)="router.navigate(['profile','all'])">
        <img src="./../assets/App icons/search.png" style="cursor:pointer;float:left;width:30px;margin:5px 45px 5px 45px;border-radius:3px;-webkit-filter:brightness(100);filter:brightness(100);" (click)="router.navigate(['search'])">
        <img src="./../assets/App icons/website.png" style="padding:2px;cursor:pointer;float:left;width:30px;margin:5px 5px 5px 45px;border-radius:3px;filter: brightness(0) invert(1)" onclick="window.open('https://discover.perrinn.com','_blank')">
      </div>
    </div>
    <div>
      <div *ngIf="UI.currentUser" style="max-width:800px;margin:0 auto">
        <div style="float:left;width:125px;height:33px;cursor:pointer;border-style:solid;border-width:0 1px 0 0;border-color:#ddd" (click)="router.navigate(['profile',UI.currentUser])">
          <img *ngIf="UI.currentUserLastMessageObj?.imageUrlThumbUser" [src]="UI.currentUserLastMessageObj.imageUrlThumbUser" style="display:inline;float:left;margin:4px;border-radius:50%;object-fit:cover;width:25px;height:25px">
          <div *ngIf="UI.currentUserLastMessageObj?.wallet?.balance" style="float:left;margin:8px;font-size:12px">{{UI.currentUserLastMessageObj.wallet.balance|number:'1.2-2'}}</div>
        </div>
        <img style="float:left;width:22px;margin:5px 8px 5px 8px;cursor:pointer;opacity:.6" (click)="router.navigate(['chat',this.UI.currentUser+'Log'])" src="./../assets/App icons/fact_check_black_24dp.svg">
        <img style="float:right;width:20px;margin:5px 8px 5px 8px;cursor:pointer;opacity:.6" (click)="router.navigate(['settings'])" src="./../assets/App icons/settings-24px.svg">
        <div style="float:right;height:33px;border-style:solid;border-width:0 1px 0 0;border-color:#ddd"></div>
        <img *ngIf="UI.currentUserLastMessageObj?.wallet?.balance>0" style="float:right;width:20px;margin:5px 8px 5px 8px;cursor:pointer;filter:grayscale(100%)" src="./../assets/App icons/onshape_new.png" onclick="window.open('https://cad.onshape.com/documents?nodeId=31475a51a48fbcc9cfc7e244&resourceType=folder','_blank')">
        <img *ngIf="UI.currentUserLastMessageObj?.wallet?.balance>0" style="float:right;width:18px;margin:5px 8px 5px 8px;cursor:pointer;margin-top:7px;filter:grayscale(100%)" src="./../assets/App icons/Google_Drive_icon_(2020).svg" onclick="window.open('https://drive.google.com/drive/u/1/folders/1qvipN1gs1QS4sCh1tY8rSSFXV5S0-uR3','_blank')">
        <img *ngIf="UI.currentUserLastMessageObj?.wallet?.balance>0" style="float:right;width:18px;margin:5px 8px 5px 8px;cursor:pointer;margin-top:8px;filter:grayscale(100%)" src="./../assets/App icons/google-meet-logo.png" onclick="window.open('https://meet.google.com/rxn-vtfa-shq','_blank')">
        <div style="float:right;height:33px;border-style:solid;border-width:0 1px 0 0;border-color:#ddd"></div>
        <img style="float:right;width:20px;margin:5px 8px 5px 8px;cursor:pointer;opacity:.6" (click)="newMessage()" src="./../assets/App icons/create-24px.svg">
      </div>
      <div class="seperator" style="width:100%;margin:0px"></div>
    </div>
    <div id='main_container'>
      <router-outlet></router-outlet>
    </div>
  `,
})
export class AppComponent {

  constructor(
    public router:Router,
    public afs:AngularFirestore,
    public UI:UserInterfaceService
  ) {
    localStorage.clear();
  }

  ngOnInit() {
    document.getElementById('uploader').style.visibility = 'hidden';
    document.getElementById('fullScreenImage').style.visibility = 'hidden';
  }

  hideFullScreenImage() {
    const fullScreenImage = document.getElementById('fullScreenImage') as HTMLImageElement;
    fullScreenImage.style.visibility = 'hidden';
    fullScreenImage.src = '';
  }

  newMessage() {
    this.router.navigate(['chat',this.newId()])
  }

  newId():string{
    const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let autoId=''
    for(let i=0;i<20;i++){
      autoId+=chars.charAt(Math.floor(Math.random()*chars.length))
    }
    return autoId
  }

}
