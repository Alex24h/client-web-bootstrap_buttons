import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { TeamsComponent }  from './teams.component';
import { UsersComponent }  from './users.component';
import { ChatComponent }  from './chat.component';
import { LoginComponent }  from './login.component';
import { UserProfileComponent }  from './userProfile.component';
import { ProjectProfileComponent }  from './projectProfile.component';
import { ProjectsComponent }  from './projects.component';
import { AddMemberComponent }  from './addMember.component';
import { AddTeamComponent }  from './addTeam.component';
import { FollowTeamComponent }  from './followTeam.component';
import { FollowProjectComponent }  from './followProject.component';
import { WalletComponent }  from './wallet.component';
import { CreateTeamComponent }  from './createTeam.component';
import { CreateProjectComponent }  from './createProject.component';
import { CreateTransactionComponent }  from './createTransaction.component';
import { TeamProfileComponent }  from './teamProfile.component';
import { BuyCoins }  from './buyCoins.component';
import { COINinfo }  from './COINinfo.component';
import { TeamAds }  from './teamAds.component';
import { LinkyModule } from 'angular-linky';

import { AngularFireModule } from 'angularfire2';
import { AngularFireDatabaseModule } from 'angularfire2/database';
import { AngularFireAuthModule } from 'angularfire2/auth';

// Must export the config
export const firebaseConfig = {
  apiKey: "AIzaSyAoG3PvimV926EgWlGvpzXrZAkOi1uWdcs",
  authDodash: "perrinn-d5fc1.firebaseapp.com",
  databaseURL: "https://perrinn-d5fc1.firebaseio.com",
  storageBucket: "perrinn-d5fc1.appspot.com",
  messagingSenderId: "44958643568"
};

@NgModule({
  declarations: [
    AppComponent,
    TeamsComponent,
    UsersComponent,
    ChatComponent,
    LoginComponent,
    UserProfileComponent,
    ProjectProfileComponent,
    ProjectsComponent,
    AddMemberComponent,
    AddTeamComponent,
    FollowTeamComponent,
    FollowProjectComponent,
    WalletComponent,
    CreateTeamComponent,
    CreateProjectComponent,
    CreateTransactionComponent,
    TeamProfileComponent,
    BuyCoins,
    COINinfo,
    TeamAds,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    AngularFireModule.initializeApp(firebaseConfig),
    AngularFireDatabaseModule,
    AngularFireAuthModule,
    AppRoutingModule,
    LinkyModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
