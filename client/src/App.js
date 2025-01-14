import React, { useState, useEffect } from 'react';
import { Route, Switch, Redirect, useLocation } from 'react-router-dom';

import * as Routes from './routes';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Note from './pages/Note';
import Notes from './pages/Notes';
import Navbar from './components/navbar/Navbar';
import { getUserAuth } from './utils/apiWrapper';

function App() {
  const [user, setUser] = useState(null);
  const location = useLocation();

  // updates user session on router changes
  useEffect(() => {
    const userAuth = async () => {
      const resp = await getUserAuth();
      if (!resp.error) setUser(resp?.data?.result);
    };
    userAuth();
  }, [location]);

  // TODO: Create user context and remove prop drilling

  return (
    <div>
      {user && <Navbar user={user} />}
      <Switch>
        <Route exact path={Routes.LOGIN_PAGE}>
          {user ? <Redirect to={Routes.DEFAULT} /> : <Login />}
        </Route>
        <Route path={Routes.MEMBER_PAGE}>
          <Switch>
            <Route path={Routes.NOTE_PAGE}>
              {user && <Note user={user} />}
            </Route>
            <Route DEFAULT>
              {user ? <Profile /> : <Redirect to={Routes.LOGIN_PAGE} />}
            </Route>
          </Switch>
        </Route>
        <Route path={Routes.NOTE_PAGE}>{user && <Note user={user} />}</Route>
        <Route path={Routes.NOTES}>
          <Notes />
        </Route>
        <Route path={Routes.DEFAULT}>
          {user ? <Home user={user} /> : <Redirect to={Routes.LOGIN_PAGE} />}
        </Route>
      </Switch>
    </div>
  );
}

export default App;
