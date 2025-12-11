// Lets do all database stuff here and just share this global context with the rest of the App
// - so no database code anywhere else in our App
// - every CRUD function the App needs to do is in here, in one place
// - makes debugging etc so much easier
// - all external connections still have to go through /api routes 

import { createContext, useState, useEffect } from 'react'

const GlobalContext = createContext()

export function GlobalContextProvider(props) {
    const [globals, setGlobals] = useState({ aString: 'init val', count: 0, hideHamMenu: true, username: null })

    // Check for existing session on component mount
    useEffect(() => {
        const savedUsername = sessionStorage.getItem('username')
        if (savedUsername) {
            setGlobals(prev => ({ ...prev, username: savedUsername }))
        }
    }, [])

    async function logout() {
        const currentUsername = globals.username
        
        // Clear data only for default users (ending with d3d)
        if (currentUsername && currentUsername.endsWith('d3d')) {
            try {
                await fetch('http://localhost:8000/api/timetrack/user/projects', {
                    method: 'DELETE'
                })
            } catch (error) {
                console.error('Error clearing projects:', error)
            }
        }
        
        try {
            await fetch('http://localhost:8000/api/auth/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
        } catch (error) {
            console.error('Logout error:', error)
        }
        sessionStorage.removeItem('username')
        setGlobals(prev => ({ ...prev, username: null }))
    }

    async function editGlobalData(command) { // {cmd: someCommand, newVal: 'new text'}
        if (command.cmd == 'hideHamMenu') { // {cmd: 'hideHamMenu', newVal: false} 
            //  WRONG (globals object reference doesn't change) and react only looks at its 'value' aka the reference, so nothing re-renders:
            //    setGlobals((previousGlobals) => { let newGlobals = previousGlobals; newGlobals.hideHamMenu = command.newVal; return newGlobals })
            // Correct, we create a whole new object and this forces a re-render:
            setGlobals((previousGlobals) => {
                const newGlobals = JSON.parse(JSON.stringify(previousGlobals));
                newGlobals.hideHamMenu = command.newVal; return newGlobals
            })
        }
        if (command.cmd == 'setUsername') {
            if (command.newVal) {
                sessionStorage.setItem('username', command.newVal)
            } else {
                sessionStorage.removeItem('username')
            }
            setGlobals((previousGlobals) => {
                const newGlobals = JSON.parse(JSON.stringify(previousGlobals));
                newGlobals.username = command.newVal; return newGlobals
            })
        }


    }

    const context = {
        updateGlobals: editGlobalData,
        logout: logout,
        theGlobalObject: globals
    }

    return <GlobalContext.Provider value={context}>
        {props.children}
    </GlobalContext.Provider>
}


export default GlobalContext
