import classes from './HamMenuContent.module.css'
import { useRouter } from 'next/router'
import { useContext, useState } from 'react'
import GlobalContext from "../../pages/store/globalContext"

export default function HamMenuContent(props) {
    const globalCtx = useContext(GlobalContext)
    const router = useRouter()
    let [popupToggle, setPopupToggle] = useState(false)

    if (globalCtx.theGlobalObject.hideHamMenu) {
        return null
    }

    async function clicked(webAddress) {
        globalCtx.updateGlobals({ cmd: 'hideHamMenu', newVal: true })
        
        // Handle logout
        if (webAddress === '/auth/login') {
            // Notify backend about logout
            try {
                await fetch('http://localhost:8000/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                })
            } catch (error) {
                console.error('Logout notification failed:', error)
            }
            
            // Switch back to default user
            globalCtx.updateGlobals({ cmd: 'setUsername', newVal: null })
            localStorage.removeItem('access_token')
            localStorage.removeItem('user')
        }
        
        router.push(webAddress)
    }

    function closeMe() {
        globalCtx.updateGlobals({ cmd: 'hideHamMenu', newVal: true })
        if (popupToggle == true) {
            setPopupToggle(false)
        } else {
            setPopupToggle(true)
        }
    }

    let contentJsx = props.contents.map((item, index) => (  //  [{title: 'Meeting 1', webAddress: '/meet1'}, {title: 'Meeting 2', webAddress: '/meet2'}]
        <div className={classes.menuItem} key={index} onClick={() => clicked(item.webAddress)} >{item.title} </div>
    ))

    return (
        <div className={classes.background} onClick={() => closeMe()} >
            <div className={classes.mainContent} >
                {contentJsx}
            </div>
        </div>
    );
}
