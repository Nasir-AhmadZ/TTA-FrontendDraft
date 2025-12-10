import classes from './MainNavigation.module.css'
import Link from 'next/link'
import HamMenu from "../generic/HamMenu"

import { useContext } from 'react'
import GlobalContext from "../../pages/store/globalContext"
import HamMenuContent from "./HamMenuContent"
import { useRouter } from 'next/router'

function MainNavigation() {
  const globalCtx = useContext(GlobalContext)
  const router = useRouter()

  function toggleMenuHide() {
    globalCtx.updateGlobals({ cmd: 'hideHamMenu', newVal: false })
  }

  const contents = [
    {title: 'Home', webAddress: '/'},
    {title: 'Time Entries', webAddress: '/timetrack'},
    {title: 'Projects', webAddress: '/projects'}
  ]
  
  // Add logout option if user is logged in
  if (globalCtx.theGlobalObject.username) {
    contents.push({title: 'Logout', webAddress: '/auth/login'})
  }

  return (
    <header className={classes.header}>
      <HamMenuContent contents={contents} />
      <div className={classes.leftSection}>
        <HamMenu toggleMenuHide={() => toggleMenuHide()} />
        <div className={classes.roundIcon} onClick={() => router.push('/')} style={{cursor: 'pointer'}}>
          <img src="/icon.png" alt="Icon" className={classes.iconImage} />
        </div>
      </div>
      <nav>
        <ul>
          <li>
            <Link href='/'>Home</Link>
          </li>
          <li>
            <Link href='/timetrack'>Time Entries</Link>
          </li>
          <li>
            <Link href='/projects'>Projects</Link>
          </li>
        </ul>
      </nav>
      <div className={classes.userSection}>
        {globalCtx.theGlobalObject.username ? (
          <div className={classes.username}>{globalCtx.theGlobalObject.username}</div>
        ) : (
          <Link href='/auth/login' className={classes.loginLink}>log in</Link>
        )}
      </div>
    </header>
  );
}

export default MainNavigation
