import { useRef, useEffect } from "react";
import { useNavigate } from 'react-router-dom'; 
import { gsap } from "gsap";
import { Bars3CenterLeftIcon } from '@heroicons/react/24/outline';

const BREAKPOITN_LG = 1024 //1024px
function Sidebar({ isMobileMenuOpen, setUser, user, options, selectNavbar, onItemClick }) {
  const sidebarRef = useRef(null)
  const navigate = useNavigate();
  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  }
  function handleNavbar(item) {
    if (onItemClick) {
      onItemClick(item)
    }

  }
  useEffect(() => {
    if (!sidebarRef.current) return;
    if (window.innerWidth < BREAKPOITN_LG) {
      gsap.set(sidebarRef.current, {
        left: '-100vw',
        opacity: 0,
      });
    }
    if (isMobileMenuOpen && window.innerWidth < BREAKPOITN_LG) {
      console.log('here')
      gsap.to(sidebarRef.current, {
        left: 0,
        opacity: 1,
        duration: 0.7,
        z: 10,
        ease: "power2.out",
      });
    } else if (!isMobileMenuOpen && window.innerWidth < BREAKPOITN_LG) {
      gsap.to(sidebarRef.current, {
        left: '-100vw',
        opacity: 0,
        duration: 0.7,
        ease: "power2.in",
      });
    }
  }, [isMobileMenuOpen]);
  return (
    <div
      ref={sidebarRef}
      className="
            bg-white dark:bg-slate-950 flex flex-col items-center justify-between p-6 shadow-xl  border-gray-200 dark:border-slate-800
             w-2/3 lg:w-60 fixed left-[-100vw] lg:left-0 transition-all duration-300 ease-in-out h-screen z-20 md:z-0 border-r
          "
    >
      <Bars3CenterLeftIcon className="size-8 text-slate-500"/>
      <ul className="flex flex-col items-start justify-center gap-4">
        {options.map((option, index) =>
          <li onClick={() => handleNavbar(index)} key={index} className={`font-bold cursor-pointer hover:underline transition-all duration-300 ease-in-out grid place-content-center bg-slate-200 dark:bg-slate-800 shadow-2xs p-4 rounded-lg ${selectNavbar == index ? 'text-slate-600' : 'text-slate-950 dark:text-slate-50 '}`} title={option.title}>
            {option.icon}
          </li>
        )}
      </ul>
      <div>
        <div className="flex flex-col h-full items-center justify-center gap-2">
          <span className="text-center text-gray-500 dark:text-gray-400 text-sm mt-auto">
            Hi, {user?.name ? user.name : (user?.email || 'Usuario')} 👋
          </span>
          <button onClick={handleLogout} className="w-full py-3 px-4 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-800 transition-colors duration-200 text-gray-700 dark:text-gray-300 font-medium flex items-center justify-center gap-3 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  )
}
export default Sidebar;