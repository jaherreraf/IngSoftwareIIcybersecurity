import { useState, useRef, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import Sidebar from "../components/Sidebar";
import Theme from "../components/Theme";
import Scan from "../components/Scan"
import ARV_extractor from "../components/ARV_extractor"
import History from "../components/History";
import Message from "../components/Message";
import axios from "axios";
import 'react-circular-progressbar/dist/styles.css';
import { CircularProgressbar } from 'react-circular-progressbar';
import { DocumentMagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { AdjustmentsVerticalIcon } from '@heroicons/react/24/outline';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import { ArrowDownTrayIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

// importación de supabase eliminada

const API_KEY = "cd5325a1662758dae81656a6a25b8c1291248e94fa8057d143717d6173ff04d5";
import gsap from "gsap";
const DELAY_MS = 3000;
// Añadido: base de la API y utilidades de hashing/polling
const API_BASE = 'https://www.virustotal.com/api/v3';
const API_QUICKSAND_BASE = 'http://127.0.0.1:8001'

async function computeSHA256(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function pollAnalysis(analysisId, apiKey, { timeoutMs = 90000 } = {}) {
  const start = Date.now();
  let delay = 1000;
  while (Date.now() - start < timeoutMs) {
    try {
      const resp = await axios.get(`${API_BASE}/analyses/${analysisId}`, {
        headers: { 'x-apikey': apiKey }
      });
      const attrs = resp?.data?.data?.attributes;
      if (attrs?.status === 'completed') return resp.data;
      if (attrs?.status === 'queued' || attrs?.status === 'running') {
        await sleep(delay);
        delay = Math.min(Math.floor(delay * 1.5), 5000);
        continue;
      }
      throw new Error(`Estado inesperado: ${attrs?.status || 'desconocido'}`);
    } catch (err) {
      if (err?.response?.status === 429) {
        // rate limit: espera y reintenta
        await sleep(Math.max(delay, 2000));
        delay = Math.min(Math.floor(delay * 1.5), 5000);
        continue;
      }
      throw err;
    }
  }
  throw new Error('Tiempo de espera agotado al obtener el análisis.');
}
const getFileHash = async (file) => {
  if (!file) {
    return null;
  }

  // 1. Leer el contenido del archivo como un ArrayBuffer
  const buffer = await file.arrayBuffer();

  // 2. Calcular el hash SHA-256 del buffer
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);

  // 3. Convertir el ArrayBuffer del hash a una cadena hexadecimal
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return hashHex;
};
function Dashboard({ setUser }) {
  const [file, setFile] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Nuevo estado para el menú móvil
  const [quicksand, setQuicksand] = useState({ state: null, results: null });
  const [msgError, setMsgError] = useState({
    msg: null,
    state: false,
  })
  const [selectNavbar, setSelectNavbar] = useState(0);
  const [options, setOptions] = useState(
    [{ title: 'Escaner Archivo', icon: <DocumentMagnifyingGlassIcon className="size-6 text-slate-900 dark:text-slate-50 font-bold hover:text-purple-500 transition-all duration-300 ease-in-out"/> },
    { title: 'Extractor de String', icon: <AdjustmentsVerticalIcon className="size-6 text-slate-900 dark:text-slate-50 font-bold hover:text-purple-500 transition-all duration-300 ease-in-out"/> },
    { title: 'Historial', icon: <ChartBarIcon className="size-6 text-slate-900 dark:text-slate-50 font-bold hover:text-purple-500 transition-all duration-300 ease-in-out"/>}
    ]
  )
  const activeScanId = useRef(0); // invalidar resultados de scans previos
  const navigate = useNavigate();
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    // Reinicia el resultado de análisis al cargar un nuevo archivo
    setAnalysisResult(null);
  };
  const scanFile = async () => {
    if (!file) {
      console.error("No hay archivo para escanear.");
      return;
    }
    const scanId = ++activeScanId.current; // id de esta corrida
    setIsScanning(true);
    setAnalysisResult(null);

    try {
      ///START ANALYZE QUICKSAND
      try {
        const formData = new FormData();
        formData.append('file', file, file.name);
        const response = await axios.post(
          `${API_QUICKSAND_BASE}/api/quicksand-analyze`,
          formData,
          {
            // 3. Cabecera para indicar el tipo de contenido de la solicitud.
            //    **¡OJO!** Al usar FormData, DEBES omitir el 'Content-Type'. 
            //    Axios/el navegador lo establecerán automáticamente a 'multipart/form-data' 
            //    y añadirán el 'boundary' (límite) necesario para que la API lo interprete correctamente.
            headers: {
              // 'Content-Type': 'multipart/form-data', // <-- ¡NO LO PONGAS!
            }
          }
        );
        const qsPayload = response.data.analysis_results || {}
        const state = qsPayload.risk
        const results = qsPayload.results
        console.log('QUICKSAND RAW:', qsPayload)
        setQuicksand({
          state: state,
          results: results,
          score: qsPayload.score,
          tags: qsPayload.tags
        });
        console.log('ESTATUS DE QUICKSAND: ', state, 'SCORE:', qsPayload.score, 'TAGS:', qsPayload.tags, 'RESULTADOS:', results)
      } catch (error) {
        if (error.response) {
          console.error("Error en la API de QuickSand:", error.response.data);
        } else {
          console.error("Error de red/petición:", error.message);
        }
      }
      ///END ANALYZE QUICKSAND
      // 1) Intentar obtener reporte existente por hash (rápido si ya fue analizado)
      const sha256 = await computeSHA256(file);
      try {
        const reportResp = await axios.get(`${API_BASE}/files/${sha256}`, {
          headers: { 'x-apikey': API_KEY },
        });
        const lastResults = reportResp?.data?.data?.attributes?.last_analysis_results;
        if (lastResults) {
          if (scanId === activeScanId.current) {
            setAnalysisResult(lastResults);
            setIsScanning(false);
            // Guardar datos solo cuando analysisResult está listo
            await handleSubmitFile(lastResults);
          }
          return;
        }
      } catch (err) {
        // Si no existe (404) seguimos a subir; otros errores se reportan
        if (err?.response?.status && err.response.status !== 404) {
          if (scanId === activeScanId.current) {
            setMsgError({ msg: 'Error consultando el reporte del archivo.', state: true });
            setIsScanning(false);
          }
          return;
        }
      }

      // 2) Subir archivo (no forzar Content-Type para no romper el boundary)
      const formData = new FormData();
      formData.append('file', file);

      const uploadResp = await axios.post(`${API_BASE}/files`, formData, {
        headers: { 'x-apikey': API_KEY },
      });

      const analysisId = uploadResp?.data?.data?.id;
      if (!analysisId) {
        throw new Error('No se obtuvo un ID de análisis válido.');
      }

      // 3) Polling robusto con backoff
      const analysisData = await pollAnalysis(analysisId, API_KEY, { timeoutMs: 90000 });
      // Al terminar el análisis, obtener el reporte completo por hash
      const reportResp2 = await axios.get(`${API_BASE}/files/${sha256}`, {
        headers: { 'x-apikey': API_KEY },
      });
      const lastResults2 = reportResp2?.data?.data?.attributes?.last_analysis_results;
      if (lastResults2) {
        if (scanId === activeScanId.current) {
          setAnalysisResult(lastResults2);
          setIsScanning(false);
          // Guardar datos solo cuando analysisResult está listo
          await handleSubmitFile(lastResults2);
        }
      } else {
        if (scanId === activeScanId.current) setMsgError({ msg: 'Análisis completado pero sin resultados disponibles.', state: true });
      }
    } catch (error) {
      console.error("Hubo un error al escanear el archivo:", error);
      const isRateLimit = error?.response?.status === 429;
      if (scanId === activeScanId.current) {
        setMsgError({
          msg: isRateLimit
            ? 'Límite de peticiones alcanzado. Intenta de nuevo en un momento.'
            : 'Error al conectar con la API de VirusTotal. Intenta nuevamente.',
          state: true
        });
      }
    } finally {
      if (scanId === activeScanId.current) setIsScanning(false);
      // handleSubmitFile() eliminado del finally
    }
  };
  useEffect(() => {
    if (file) {
      scanFile();
    }
  }, [file]);
  async function handleSubmitFile(lastResults, fileAttributes) {
    let newRecordId = null;
    let newScanId = null;
    if (!file) return;
    const fileHash = await getFileHash(file);
    if (!fileHash) {
      console.error('No se pudo calcular el hash del archivo.');
      return;
    }
    try {
      console.log("TABLE FILE");
      const newFileRow = {
        user_id: user.user_id,
        file_name: file.name,
        file_type: file.type,
        file_hash: fileHash,
      };

      const response = await fetch('http://localhost:3001/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFileRow)
      });
      const insertData = await response.json();
      if (!response.ok) {
        console.error('Error al insertar en la DB:', insertData.error);
        return;
      }
      newRecordId = insertData.file_id;
      console.log('FILA INSERTADA CON EXITO:', insertData);
    } catch (error) {
      console.error('Ocurrió un error inesperado file:', error);
    }
    try {

      const enginesArray = lastResults ? Object.values(lastResults) : [];
      const vt_score = enginesArray.filter(r => r.category === 'malicious').length;

      const raw_total_analyzers = lastResults ? Object.keys(lastResults).length : 0;
      const effective_analyzers = enginesArray.filter(r => !['type-unsupported', 'timeout', 'failure', 'error'].includes(r.category)).length;
      const maliciousEngines = enginesArray
        .filter(r => r.category === 'malicious')
        .map(r => ({ engine_name: r.engine_name, result: r.result, category: r.category }));

      const attrs = fileAttributes || {};
      const has_digital_signature = Boolean(
        attrs?.signature_info || attrs?.signature || attrs?.authentihash || attrs?.pe_info?.file_version
      );

      const estado = vt_score > 0 ? 'Malicioso' : (raw_total_analyzers > 0 ? 'Seguro' : 'Error');

      const enrichedReport = {
        file: {
          name: file?.name,
          size_bytes: file?.size,
          size_kb: file ? +(file.size / 1024).toFixed(2) : null,
          type: file?.type || attrs?.type_description || null,
          hash_sha256: attrs?.sha256 || fileHash,
          magic: attrs?.magic || null,
          meaningful_name: attrs?.meaningful_name || null,
        },
        analysis: {
          vt_score,
          total_analyzers: raw_total_analyzers,
          effective_analyzers,
          state: estado,
          last_analysis_stats: attrs?.last_analysis_stats || null,
          last_analysis_results: lastResults || null,
          malicious_engines: maliciousEngines,
          reputation: attrs?.reputation ?? null,
          times_submitted: attrs?.times_submitted ?? null,
          first_submission_date: attrs?.first_submission_date ? new Date(attrs.first_submission_date * 1000).toISOString() : null,
          last_submission_date: attrs?.last_submission_date ? new Date(attrs.last_submission_date * 1000).toISOString() : null,
          scan_date: new Date().toISOString(),
          has_digital_signature,
        },
        user: {
          user_id: user?.user_id,
          name: user?.name,
          email: user?.email,
        },
        meta: {
          generated_at: new Date().toISOString(),
          version: 1,
          source: 'frontend-dashboard'
        }
      };

      const newRow = {
        file_id: newRecordId,
        scan_report: JSON.stringify(enrichedReport),
        vt_score,
        total_analyzers: raw_total_analyzers,
      };
      // Guardar análisis en la base de datos
      const response = await fetch('http://localhost:3001/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRow)
      });
      const insertData = await response.json();
      if (!response.ok) {
        console.error('Error al insertar en la DB:', insertData.error);
        return;
      }
      newScanId = insertData.scan_id;
      console.log('Fila insertada con éxito:', insertData);

    } catch (error) {
      console.error('Ocurrió un error inesperado:', error);
    }
    // Calcular las detecciones maliciosas usando el resultado recibido
    const maliciousDetections = lastResults
      ? Object.values(lastResults).filter(r => r.category === 'malicious')
      : [];
    console.log('DESPUES DE QUICKSAND')
    if (maliciousDetections.length > 0)
      try {
        console.log("VENDOR WARNING:");

        // 1. Procesar maliciousDetections (VirusTotal)
        const virusTotalRows = maliciousDetections.map(target => ({
          vendor_name: target.engine_name,
          warning_message: target.result
        }));
        const quicksandResults = quicksand.results || {};

        // 2. Procesar quicksand.results (detecciones por flujo/stream)
        const quicksandRows = Object.entries(quicksandResults).flatMap(([flowName, detectionsArray]) => {
          // flowName es la clave (ej: "root", "root-stream-Macros-VBA-ThisDocument")
          // detectionsArray es el array de objetos de detección de YARA que quieres mapear

          // Mapeamos el array interno de detecciones.
          return detectionsArray.map(detection => ({
            // Usamos la propiedad 'rule' como vendor_name
            vendor_name: detection.rule,
            // Usamos la propiedad 'desc' como warning_message
            warning_message: detection.desc,
          }));
        });

        // 3. Combinar ambos arrays
        const newRows = [
          ...virusTotalRows,
          ...quicksandRows
        ];
        // Guardar advertencias en la base de datos
        const response = await fetch('http://localhost:3001/api/warnings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_id: newRecordId, scan_id: newScanId, warnings: newRows })
        });
        const insertData = await response.json();
        if (!response.ok) {
          console.error('Error al insertar en la DB:', insertData.error);
          return;
        }
        console.log('vendor_warning insertada con éxito:', insertData);
        // Aquí puedes añadir cualquier lógica de éxito, como mostrar una notificación.
      } catch (error) {
        console.error('Ocurrió un error inesperado:', error);
      }
  }

  function handleEmptyFile() {
    activeScanId.current++;         // invalida cualquier scan en curso
    setIsScanning(false);           // detiene spinner
    setAnalysisResult(null);        // limpia resultados
    setFile(null);                  // limpia archivo
  }
  function handleSidebarSelected(data){
    console.log("SELECT NAVBAR: ", data);
    setSelectNavbar(data);
  }
  // Calcula los contadores para el componente CircularProgressbar
  const maliciousCount = analysisResult
    ? Object.values(analysisResult).filter(r => r.category === 'malicious').length
    : 0;
  const maliciousDetections = analysisResult
    ? Object.values(analysisResult).filter(r => r.category === 'malicious')
    : [];
  const totalAnalyzers = analysisResult ? Object.keys(analysisResult).length : 0;
  function handleMsgError() {
    setMsgError(!msgError)
  }

  const user = JSON.parse(localStorage.getItem('user'));
  return (
    // Nota: se removió h-screen y overflow-hidden para permitir scroll vertical.
    <div className="App w-screen min-h-screen bg-slate-100 dark:bg-slate-900 overflow-x-hidden font-ubuntu">
      <div className="w-full lg:max-h-screen flex items-start justify-start min-h-full">
        {/* --- Sidebar Desktop --- */}
        <Sidebar isMobileMenuOpen={isMobileMenuOpen} user={user} setUser={setUser} options={options} onItemClick={handleSidebarSelected} />
        <div className="w-60 lg:left-0 hidden lg:block lg:static h-[100vh]">
        </div>

        {/* Overlay oscuro para el móvil */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-slate-100/60 dark:bg-slate-950/60 z-10 md:hidden transition-all duration-1000 ease-linear"
            onClick={() => setIsMobileMenuOpen(false)}
          >
          </div>
        )}
        {/* --- Contenido Principal Condicional --- */}
        <div id="content" className="w-screen lg:w-full h-screen md:col-span-6 flex flex-col gap-6 p-6 flex-1 overflow-y-auto transition-all duration-300 ease-in-out">

          {/* --- Barra superior --- */}
          <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm p-4 flex items-center justify-between border border-gray-200 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <svg onClick={() =>setIsMobileMenuOpen(true)} className="size-8 text-slate-900 dark:text-slate-100 md:hidden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><path stroke="#464455" strokeLinecap="round" strokeLinejoin="round" d="M5 8h8.8M5 12h14m-8.8 4H19" /></svg>
              <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200">MalwareScan</h1>
            </div>
            <Theme />
          </div>
          {/* --- Nuevo diseño para el archivo cargado --- */}
          { selectNavbar != 2 && <FileDropZone file={file} selectNavbar={selectNavbar} handleFileChange={handleFileChange } maliciousCount={maliciousCount} totalAnalyzers={totalAnalyzers} handleEmptyFile={handleEmptyFile} scanFile={scanFile} isScanning={isScanning}/>}
          {/* Renderiza el área de carga solo si no hay un archivo */}
          {selectNavbar == 0 && <Scan file={file} maliciousCount={maliciousCount} totalAnalyzers={totalAnalyzers} analysisResult={analysisResult} isScanning={isScanning} scanFile={scanFile} handleEmptyFile={handleEmptyFile} quicksand={quicksand}></Scan>}
          {selectNavbar == 1 && <ARV_extractor file={file} />}
          {selectNavbar == 2 && <History />}

        </div>
      </div>
      {
        msgError.state && <Message msg={msgError.msg} onComplete={handleMsgError} />
      }
    </div>
  );
}
const ScanProgressCircle = ({ maliciousCount, totalAnalyzers }) => {
  const percentage = (maliciousCount / totalAnalyzers) * 100;
  const textColor = maliciousCount > 0 ? '#ef4444' : '#10b981'; // Rojo si es malicioso, verde si es seguro

  return (
    <div style={{ width: 140, height: 140 }} className="relative float-left">
      <CircularProgressbar
        value={percentage}
        text={`${maliciousCount}/${totalAnalyzers}`}
        styles={{
          path: {
            stroke: maliciousCount > 0 ? '#ef4444' : '#10b981',
            strokeLinecap: 'round',
            transition: 'stroke-dashoffset 0.5s ease 0s',
          },
          trail: {
            stroke: '#e5e7eb',
          },
          text: {
            fill: textColor,
            fontSize: '16px',
            fontWeight: 'bold',
          },
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <div className="text-xs text-gray-500 mt-12">detectados</div>
      </div>
    </div>
  );
};
// Mensajes a rotar
const MESSAGES = ["Arrastra y suelta tu archivo aquí", "o haz clic y explora tu dispositivo"
];

function FileDropZone({ file,  handleFileChange, maliciousCount, totalAnalyzers, handleEmptyFile, scanFile, isScanning }) {
    
    // ESTADOS Y REFERENCIAS
    const [isExpanded, setIsExpanded] = useState(true);
    const arrowRef = useRef(null); 
    const contentRef = useRef(null); 
     const nameRefs = useRef([]);
    nameRefs.current = [];

    const addToRefs = (el) => {
        if (el && !nameRefs.current.includes(el)) {
            nameRefs.current.push(el);
        }
    };
    useEffect(() => {
        if (arrowRef.current && isExpanded) {
            gsap.to(arrowRef.current, {
                y: 10,
                duration: 1.2,
                ease: "power1.inOut",
                repeat: -1,
                yoyo: true,
            });
        }
        return () => {
            if (arrowRef.current) {
                gsap.killTweensOf(arrowRef.current);
                gsap.set(arrowRef.current, { y: 0 });
            }
        };
    }, [isExpanded, file]);

    // ------------------------------------------------------------------------
    // EFECTO 2: Animación de COLAPSO/EXPANSIÓN del contenido (GSAP)
    // ------------------------------------------------------------------------
    useEffect(() => {
        if (contentRef.current) {
            gsap.to(contentRef.current, {
                height: isExpanded ? "auto" : 0, 
                paddingTop: isExpanded ? '1rem' : 0, 
                paddingBottom: isExpanded ? '1rem' : 0,
                opacity: isExpanded ? 1 : 0,
                duration: 0.5, 
                ease: "power2.inOut",
                overflow: 'hidden', 
            });
        }
    }, [isExpanded]);

    // ------------------------------------------------------------------------
    // EFECTO 3: Rotación de Mensajes (ADAPTADO DE TU CÓDIGO)
    // ------------------------------------------------------------------------
    useEffect(() => {
            const tl = gsap.timeline({
                repeat: -1,
                repeatDelay: 0,
            });
    
            gsap.set(nameRefs.current, { autoAlpha: 0, y: 10 });
    
            nameRefs.current.forEach((name, index) => {
                tl.to(name, {
                    duration: 0.5,
                    autoAlpha: 1,
                    y: 0,
                    ease: "power2.out",
                }, "+=0.5")
                    .to(name, {
                        duration: 0.5,
                        autoAlpha: 0,
                        y: -10,
                        ease: "power2.in",
                    }, "+=1.5");
            });
    
            return () => tl.kill();
        }, []);
    // ------------------------------------------------------------------------
    // RENDERIZADO
    // ------------------------------------------------------------------------
    if (!file) {
      return (
        <div className="bg-white dark:bg-slate-950 p-4 rounded-xl shadow-sm flex flex-col h-fit text-center border border-gray-200 dark:border-slate-800">

            {/* ENCABEZADO */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-left">
                    Escanea tu archivo ahora
                </h2>
                <button 
                    onClick={() => setIsExpanded(!isExpanded)} 
                    className="p-1 rounded-full text-gray-500 hover:text-blue-500 transition-colors"
                >
                    {isExpanded ? (<ChevronUpIcon className="size-6" />) : (<ChevronDownIcon className="size-6" />)}
                </button>
            </div>

            {/* CONTENIDO COLAPSABLE */}
            <div ref={contentRef} className="flex flex-col items-center justify-center pt-4"> 
                
                <label 
                    htmlFor="file-upload" 
                    className="relative w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-2xl p-6 transition-colors duration-200 hover:border-blue-500 cursor-pointer"
                >
                    
                    {/* ÍCONO ANIMADO */}
                    <div ref={arrowRef} className="inline-block"> 
                      <ArrowDownTrayIcon className="size-12 text-blue-800 dark:text-blue-300 mb-4"/>
                    </div>

                {MESSAGES.map((name) => (
                <span
                    key={name}
                    ref={addToRefs}
                    className="absolute bottom-2  font-semibold text-blue-800 dark:text-blue-300 whitespace-nowrap"
                >
                    {name}
                </span>
            ))}
                    
                    <input type="file" onChange={handleFileChange} id="file-upload" className="opacity-0 z-10 absolute size-full cursor-pointer" />
                </label>
            </div>
        </div>
    );
    }
    return(
    <div className="bg-white dark:bg-slate-950 p-6 rounded-xl shadow-sm flex flex-col border border-gray-200 dark:border-slate-800">
              {/* Contenedor principal para la información del archivo y el círculo */}
              <div className="flex flex-col md:flex-row justify-between items-start mb-6 w-full">
                {/* Contenedor del círculo */}
                <div className="flex-shrink-0 mb-4 mx-auto md:mr-6 md:mt-2 md:mx-0">
                  <ScanProgressCircle maliciousCount={maliciousCount} totalAnalyzers={totalAnalyzers} />
                </div>

                {/* Contenedor de la información del archivo */}
                <div className="flex-grow flex flex-col min-w-0">
                  <div className="w-full flex justify-between items-center mb-4">
                    <h2 className={`text-xl font-bold flex items-center gap-2 ${maliciousCount > 0 ? 'text-red-600 dark:text-red-500' : 'text-green-600 dark:text-green-500'}`}>
                      {maliciousCount > 0 ? (
                        <>
                          <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856a2 2 0 001.789-2.895L12 3.895 3.333 18.105A2 2 0 005.125 21z" />
                          </svg>
                          Malicioso
                        </>
                      ) : (
                        <>
                          <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Seguro
                        </>
                      )}
                    </h2>
                    <div className="flex items-center gap-2 cursor-pointer" onClick={handleEmptyFile}>
                      <button className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M12.9 14.32a8 8 0 11-1.414-1.414L18.586 19.586a2 2 0 01-2.828 2.828l-5.656-5.656z" />
                        </svg>
                      </button>
                      <button className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v1h-14V3zm0 3v13a2 2 0 002 2h10a2 2 0 002-2V6H3zm4-1a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 mb-4">
                    <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{file.name}</span>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <span>Tamaño: {(file.size / 1024).toFixed(2)} KB</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 text-xs font-medium px-2 py-0.5 rounded-full">
                        {file.type || 'Tipo desconocido'}
                      </span>
                      {/* Puedes agregar más etiquetas aquí */}
                    </div>
                  </div>

                  <div className="w-full flex items-center justify-between mt-auto">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold text-red-600 dark:text-red-500">{maliciousCount}</span> de <span className="font-semibold">{totalAnalyzers}</span> motores de análisis de Virus Total detectaron el archivo como malicioso.
                    </p>
                    <button
                      onClick={scanFile}
                      disabled={isScanning}
                      className={`py-2 px-4 rounded-lg font-semibold transition-colors duration-300 flex items-center gap-2 ${isScanning
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-blue-600 hover:bg-blue-700 cursor-pointer text-white'
                        }`}
                    >
                      {isScanning ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Escaneando...
                        </>
                      ) : (
                        'Reanalizar'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
    )   
}
// export default FileDropZone;
export default Dashboard;