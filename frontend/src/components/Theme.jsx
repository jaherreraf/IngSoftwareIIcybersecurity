import { useState, useEffect, useRef } from "react"
import gsap from "gsap"
import { SunIcon } from '@heroicons/react/24/outline';
import { MoonIcon } from '@heroicons/react/24/outline';

function Theme() {
    const [theme, setTheme] = useState(
        localStorage.getItem('theme') || 'light'
    )
    const sunRef = useRef(null)
    const moonRef = useRef(null)
    useEffect(() => {
        const root = window.document.documentElement
        if (theme === 'dark')
            root.classList.add('dark')
        else
            root.classList.remove('dark')
        localStorage.setItem('theme', theme)
    }, [theme])
   function toggleTheme(){
    const isDark = theme === 'dark';
    const activeRef = isDark ? moonRef.current : sunRef.current;
    
    const newTheme = isDark ? 'light' : 'dark';

    if(activeRef){
        gsap.to(activeRef, {
            rotation: 360,
            duration: 0.8,
            ease: "power2.out",
            onComplete: () => {
                gsap.set(activeRef, { rotation: 0 });
                setTheme(newTheme); 
            }
        });
    } else {
        setTheme(newTheme);
    }
}

    return (
        <div className="cursor-pointer">
            {theme === 'light' ?
                <SunIcon  onClick={toggleTheme} ref={sunRef} className='size-8 md:size-12 text-yellow-500 cursor-pointer'/>
                :
                <MoonIcon onClick={toggleTheme} ref={moonRef} className='size-8 md:size-12 text-gray-500 dark:text-gray-100 cursor-pointer'/>
            }
        </div>
    )
}
export default Theme;