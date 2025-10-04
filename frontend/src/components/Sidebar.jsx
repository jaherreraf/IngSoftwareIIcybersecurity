import { useRef, useEffect } from "react";
// ✅ Agrega onItemClick a las props
function Sidebar({isMobileMenuOpen, setUser, user, options, selectNavbar, onItemClick}) {
    const sidebarRef = useRef(null)
    // Función para cerrar sesión
  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  }
  function handleNavbar(item){
    console.log("Item clickeado: ", item);
    if(onItemClick){
        onItemClick(item)
    }

  }
    useEffect(() => {
    // Asegúrate de que la referencia exista
    if (!sidebarRef.current) return;

    // Usa GSAP.set() para establecer el estado inicial sin animación si estamos en móvil
    if (window.innerWidth < 768) {
      gsap.set(sidebarRef.current, {
        left: '-100vw',
        opacity: 0,
      });
    }

    // Luego, maneja la animación de apertura y cierre
    if (isMobileMenuOpen && window.innerWidth < 768) {
      gsap.to(sidebarRef.current, {
        left: 0,
        opacity: 1,
        duration: 0.7,
        z:10,
        ease: "power2.out",
      });
    } else if (!isMobileMenuOpen && window.innerWidth < 768) {
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
            md:col-span-1
            bg-white dark:bg-slate-950 flex flex-col items-center justify-between p-6 shadow-xl  border-gray-200 dark:border-slate-800
             w-2/3 md:w-60 fixed left-[-100vw] md:left-0 transition-all duration-300 ease-in-out h-screen z-10 md:z-0 border-r
          "
        >
            <header className="flex flex-col items-center justify-center gap-2 mb-8">
                <svg className="fill-red-600 dark:fill-red-500 size-16" xmlns="http://www.w3.org/2000/svg" xmlSpace="preserve" viewBox="0 0 512 512"><path d="m502.6 303.8-36.3-30.1a20.3 20.3 0 0 1 0-35.4l36.3-30.1a18.2 18.2 0 0 0-9.1-34.1l-46.6-8a20.2 20.2 0 0 1-17.6-30.5l16.4-44.3a18.2 18.2 0 0 0-25-25l-44.2 16.5A20.2 20.2 0 0 1 345.8 65L338 18.5a18.2 18.2 0 0 0-34.1-9.1l-30.1 36.3a20.3 20.3 0 0 1-35.4 0L208.2 9.4a18.2 18.2 0 0 0-34.1 9.1l-8 46.6a20.2 20.2 0 0 1-30.6 17.7L91.3 66.3a18.2 18.2 0 0 0-25 25l16.4 44.3a20.2 20.2 0 0 1-17.6 30.6L18.5 174a18.2 18.2 0 0 0-9.1 34l36.3 30.2a20.2 20.2 0 0 1 0 35.4L9.4 303.8a18.2 18.2 0 0 0 9.1 34.1l46.6 8a20.2 20.2 0 0 1 17.6 30.5l-16.4 44.3a18.2 18.2 0 0 0 25 25l44.2-16.4a20.2 20.2 0 0 1 30.7 17.6l7.9 46.6a18.2 18.2 0 0 0 34.1 9.1l30.1-36.3a20.3 20.3 0 0 1 35.4 0l30.1 36.3a18.2 18.2 0 0 0 34.1-9.1l8-46.6a20.2 20.2 0 0 1 30.6-17.6l44.2 16.4a18.2 18.2 0 0 0 25-25l-16.4-44.3a20.2 20.2 0 0 1 17.6-30.6l46.6-7.9a18.2 18.2 0 0 0 9.1-34.1zm-359.2-54.9c0-3 1.2-5.8 3.3-7.9l19.3-19.3-20.4-20.4a11.2 11.2 0 0 1 15.8-15.8l20.4 20.4 20.4-20.4a11 11 0 0 1 15.8 0 11.1 11.1 0 0 1 0 15.8l-20.4 20.4 19.3 19.3a11 11 0 0 1 0 15.8 11.1 11.1 0 0 1-15.8 0l-19.3-19.3-19.3 19.3a11.1 11.1 0 0 1-15.8 0 11 11 0 0 1-3.3-7.9zm211.1 92.3a26.7 26.7 0 0 1-19.8-8.5l-3.6-3.8c-1.8-2-3.4-3.8-4.8-4.7a7.7 7.7 0 0 0-4.7-1.4c-1.8 0-2.8.4-3.6.8-1 .5-2 1.2-3.2 2.4l-2.5 2.8c-2.2 2.4-4.8 5.4-8.6 8-3 2-8 4.4-14.7 4.4h-.2a26.6 26.6 0 0 1-19.8-8.5c-1.4-1.3-2.6-2.7-3.6-3.9-1.9-2-3.4-3.7-4.8-4.6a7.7 7.7 0 0 0-4.7-1.4c-1.7 0-2.7.3-3.6.8-1 .5-2 1.2-3.2 2.4l-2.5 2.8c-2.2 2.4-4.8 5.4-8.6 8-3 2-7.9 4.4-14.6 4.4a27 27 0 0 1-20-8.5c-1.5-1.4-2.7-2.7-3.8-4-1.8-2-3.3-3.7-4.7-4.5a7.6 7.6 0 0 0-4.7-1.4c-1.8 0-2.8.4-3.6.8-.9.5-1.9 1.2-3 2.4-1 .8-1.8 1.8-2.7 2.8-2.1 2.4-4.7 5.4-8.5 8-3 2-8 4.4-14.7 4.4a9.3 9.3 0 0 1-9.5-9.2c0-5.1 4.2-9.3 9.3-9.3 1.8 0 2.8-.3 3.6-.7 1-.5 2-1.3 3.1-2.4l2.7-2.8c2-2.4 4.7-5.4 8.4-8a26.9 26.9 0 0 1 34.7 4l3.7 4c1.8 2 3.4 3.7 4.8 4.6 1.3.9 2.4 1.3 4.6 1.3 1.9 0 2.8-.3 3.7-.7.9-.5 1.9-1.2 3-2.4l2.7-2.8c2-2.4 4.7-5.4 8.5-8a27 27 0 0 1 34.7 4l3.7 4c1.8 2 3.4 3.7 4.7 4.6 1.4.9 2.5 1.3 4.7 1.3 1.7 0 2.7-.3 3.7-.7.9-.5 1.9-1.2 3-2.4l2.7-2.8c2.1-2.4 4.7-5.4 8.5-8a27 27 0 0 1 34.7 4l3.7 4c1.8 2 3.4 3.7 4.8 4.6 1.3.9 2.4 1.3 4.7 1.3a9.2 9.2 0 0 1 0 18.5zM365.3 241a11.2 11.2 0 0 1-7.9 19c-3 0-5.8-1-7.9-3.2l-19.3-19.3-19.3 19.3a11.1 11.1 0 0 1-15.8 0 11 11 0 0 1 0-15.8l19.3-19.3-20.4-20.4a11.1 11.1 0 0 1 0-15.8 11.1 11.1 0 0 1 15.8 0l20.4 20.4 20.4-20.4a11.1 11.1 0 0 1 15.8 0 11.2 11.2 0 0 1 0 15.8L346 221.7l19.3 19.3z" /></svg>
                <span className="text-2xl font-bold dark:text-gray-200">MalwareScan</span>
            </header>
            <ul className="flex flex-col items-start justify-center gap-4">
                {options.map((option, index) =>
                    <li onClick={() => handleNavbar(index)} key={index} className={`font-bold cursor-pointer hover:underline transition-all duration-300 ease-in-out grid place-content-center bg-slate-200 dark:bg-slate-800 shadow-2xs p-4 rounded-lg ${selectNavbar == index ? 'text-slate-600' : 'text-slate-950 dark:text-slate-50 '}`} title={option.title}>
                        {option.icon}
                    </li>
                )}
            </ul>
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-xl border border-blue-200 dark:border-blue-900 shadow-sm flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                    Detector de virus
                </h3>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                    Analiza archivos de todo tipo: PDF, Word, Excel, ZIP, RAR, y muchos más. ¡Sube tu documento y protégete!
                </p>
            </div>
            <div>
                <div className="flex flex-col h-full items-center justify-center gap-2">
                    <span className="text-center text-gray-500 dark:text-gray-400 text-sm mt-auto">
                        Hi, {user?.name ? user.name : (user?.email || 'Usuario')} 👋
                    </span>
                    {/* Botón de cerrar sesión */}
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