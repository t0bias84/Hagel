import subprocess
import sys
import os
from datetime import datetime, timedelta
import signal
import threading
import queue
import logging
import platform
import psutil
import json
import shutil
import socket
from pathlib import Path
import time
import asyncio
import re
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
import traceback
import urllib.request
from concurrent.futures import ThreadPoolExecutor
import webbrowser

# Nya imports för robustare filhantering
try:
    import aiofiles
    HAS_AIOFILES = True
except ImportError:
    HAS_AIOFILES = False

# Versionshantering
REQUIRED_VERSIONS = {
    'pymongo': '4.6.1',
    'motor': '3.3.2',
    'fastapi': '0.109.0',
    'uvicorn': '0.27.0'
}
# Systemkonfiguration och Dataklasser

def kill_process_on_port(port: int):
        """Stänger alla processer som använder en given port."""
        try:
            result = subprocess.run(
                ["netstat", "-ano"],
                capture_output=True,
                text=True
            )
            lines = result.stdout.splitlines()
            for line in lines:
                if f":{port}" in line:
                    parts = line.split()
                    pid = parts[-1]
                    # Avsluta processen
                    kill_result = subprocess.run(["taskkill", "/PID", pid, "/F"], capture_output=True, text=True)
                    if kill_result.returncode == 0:
                        print(f"Process {pid} på port {port} stängd.")
                    else:
                        print(f"Misslyckades med att stänga process {pid}: {kill_result.stderr}")
        except Exception as e:
            print(f"Fel vid stängning av processer på port {port}: {str(e)}")

async def wait_for_port_to_free(port: int, timeout: int = 10) -> bool:
    start_time = time.time()
    while time.time() - start_time < timeout:
        result = subprocess.run(["netstat", "-ano"], capture_output=True, text=True)
        if f":{port}" not in result.stdout:
            return True
        await asyncio.sleep(1)
    return False

def parse_version(version_str: str) -> Tuple[int, ...]:
    """Parse version string to comparable tuple"""
    return tuple(map(int, version_str.split('.')))

def check_package_version(package_name: str, required_version: str) -> Tuple[bool, str]:
    """Kontrollera paketversion med förbättrad felhantering"""
    try:
        result = subprocess.run(
            [sys.executable, "-m", "pip", "show", package_name],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode != 0:
            return False, f"Package {package_name} not found"
            
        version_match = re.search(r'Version: ([\d.]+)', result.stdout)
        if not version_match:
            return False, f"Could not determine version for {package_name}"
            
        installed_version = version_match.group(1)
        if parse_version(installed_version) < parse_version(required_version):
            return False, f"{package_name} version {installed_version} is older than required {required_version}"
            
        return True, f"{package_name} version {installed_version} is compatible"
    except Exception as e:
        return False, f"Error checking {package_name} version: {str(e)}"

async def safe_read_file(file_path: Path) -> str:
    """Säker filläsning med fallback till synkron läsning"""
    try:
        if HAS_AIOFILES:
            async with aiofiles.open(file_path, mode='r') as f:
                return await f.read()
        else:
            with open(file_path, 'r') as f:
                return f.read()
    except Exception as e:
        raise RuntimeError(f"Could not read file {file_path}: {str(e)}")

def install_package(package_name: str, version: str = None) -> bool:
    """Installera eller uppgradera paket"""
    try:
        package_spec = f"{package_name}=={version}" if version else package_name
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install", "-U", package_spec],
            capture_output=True,
            text=True,
            timeout=180
        )
        return result.returncode == 0
    except Exception:
        return False
    
class DependencyManager:
    """Hanterar beroenden och versioner"""
    def __init__(self, logger):
        self.logger = logger
        self.missing_packages = set()
        self.incompatible_versions = set()
        
    async def verify_dependencies(self) -> bool:
        """Verifiera alla beroenden och försök åtgärda problem"""
        requirements_file = Path("backend/requirements.txt")
        if not requirements_file.exists():
            self.logger.log('ERROR', "requirements.txt not found", 'dependency')
            return False
            
        try:
            content = await safe_read_file(requirements_file)
            requirements = [
                line.strip() 
                for line in content.split('\n') 
                if line.strip() and not line.startswith('#')
            ]
        except Exception as e:
            self.logger.log('ERROR', f"Error reading requirements: {str(e)}", 'dependency')
            return False

        all_ok = True
        for req in requirements:
            try:
                package = req.split('==')[0]
                version = req.split('==')[1] if '==' in req else None
                
                # Kontrollera version om specificerad i REQUIRED_VERSIONS
                if package in REQUIRED_VERSIONS:
                    ok, msg = check_package_version(package, REQUIRED_VERSIONS[package])
                    if not ok:
                        all_ok = False
                        self.incompatible_versions.add(package)
                        self.logger.log('WARNING', msg, 'dependency')
                        
                        # Försök uppgradera till rätt version
                        if install_package(package, REQUIRED_VERSIONS[package]):
                            self.logger.log('INFO', f"Successfully upgraded {package}", 'dependency')
                            self.incompatible_versions.remove(package)
                        else:
                            self.logger.log('ERROR', f"Failed to upgrade {package}", 'dependency')
                
                # Kontrollera installation
                elif not self._is_package_installed(package):
                    all_ok = False
                    self.missing_packages.add(package)
                    self.logger.log('WARNING', f"Missing package: {package}", 'dependency')
                    
                    # Försök installera
                    if install_package(package, version):
                        self.logger.log('INFO', f"Successfully installed {package}", 'dependency')
                        self.missing_packages.remove(package)
                    else:
                        self.logger.log('ERROR', f"Failed to install {package}", 'dependency')
                        
            except Exception as e:
                self.logger.log('ERROR', f"Error processing requirement {req}: {str(e)}", 'dependency')
                all_ok = False

        return all_ok

    def _is_package_installed(self, package_name: str) -> bool:
        """Kontrollera om ett paket är installerat"""
        try:
            return subprocess.run(
                [sys.executable, "-m", "pip", "show", package_name],
                capture_output=True,
                check=True,
                timeout=10
            ).returncode == 0
        except Exception:
            return False

    def get_status(self) -> Dict[str, Any]:
        """Hämta status för beroenden"""
        return {
            'missing_packages': list(self.missing_packages),
            'incompatible_versions': list(self.incompatible_versions),
            'python_version': sys.version,
            'pip_version': self._get_pip_version()
        }

    def _get_pip_version(self) -> Optional[str]:
        """Hämta pip-version"""
        try:
            result = subprocess.run(
                [sys.executable, "-m", "pip", "--version"],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                return result.stdout.split()[1]
        except Exception:
            pass
        return None

@dataclass
class SystemInfo:
    os_name: str
    os_version: str
    python_version: str
    node_version: Optional[str]
    npm_version: Optional[str]
    cpu_count: int
    total_memory: float
    free_memory: float
    disk_space: float
    free_disk: float
    python_path: str
    project_root: Path

@dataclass
class ProjectHealth:
    backend_status: bool = False
    frontend_status: bool = False
    database_status: bool = False
    package_issues: List[str] = None
    missing_deps: List[str] = None
    config_issues: List[str] = None

    def __post_init__(self):
        self.package_issues = self.package_issues or []
        self.missing_deps = self.missing_deps or []
        self.config_issues = self.config_issues or []

class EnhancedLogger:
    def __init__(self, debug_mode: bool = False):
        self.logs_dir = Path("logs")
        self.logs_dir.mkdir(exist_ok=True)
        self.debug_mode = debug_mode
        
        # Definiera loggkategorier
        self.categories = [
            'system', 'backend', 'frontend', 'database', 
            'performance', 'error', 'security', 'dependency'
        ]
        
        # Initiera alla loggers
        self.loggers = {
            category: self._setup_logger(category, f"{category}.log")
            for category in self.categories
        }
        
        # Huvudlogger med konsolutskrift
        self.main_logger = self._setup_logger(
            'main', 
            'development.log',
            console=True,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )

    def _setup_logger(
        self, 
        name: str, 
        filename: str, 
        console: bool = False, 
        format: str = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    ) -> logging.Logger:
        logger = logging.getLogger(name)
        logger.setLevel(logging.DEBUG if self.debug_mode else logging.INFO)
        
        # Säkerställ att loggern är ren från tidigare handlers
        logger.handlers = []
        
        # Filhanterare med rotation
        file_handler = logging.FileHandler(
            self.logs_dir / filename,
            encoding='utf-8',
            mode='a'
        )
        file_handler.setFormatter(logging.Formatter(format))
        logger.addHandler(file_handler)
        
        if console:
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setFormatter(logging.Formatter(format))
            logger.addHandler(console_handler)
        
        return logger

    def log(self, level: str, message: str, category: str = 'main', exc_info: bool = None):
        """Förbättrad loggning med felhantering och stacktrace för fel"""
        logger = self.loggers.get(category, self.main_logger)
        
        try:
            log_level = getattr(logging, level.upper())
            if exc_info or level.upper() == 'ERROR':
                logger.log(log_level, message, exc_info=True)
            else:
                logger.log(log_level, message)
                
            # Skicka även allvarliga fel till error-loggen
            if level.upper() in ['ERROR', 'CRITICAL']:
                self.loggers['error'].log(log_level, f"[{category}] {message}", exc_info=True)
                
        except Exception as e:
            # Om något går fel med loggningen, försök logga till huvudloggaren
            self.main_logger.error(f"Logging error: {str(e)}", exc_info=True)

    def set_debug_mode(self, enabled: bool):
        """Ändra debug-läge för alla loggers"""
        self.debug_mode = enabled
        level = logging.DEBUG if enabled else logging.INFO
        
        for logger in self.loggers.values():
            logger.setLevel(level)
        self.main_logger.setLevel(level)

class HealthMonitor:
    def __init__(self, logger: EnhancedLogger):
        self.logger = logger
        self.health_data = []
        self.start_time = datetime.now()
        self._last_check = datetime.now()
        self._check_interval = timedelta(minutes=5)

    def collect_system_info(self) -> SystemInfo:
        """Samla detaljerad systeminformation med förbättrad felhantering"""
        try:
            system_info = SystemInfo(
                os_name=platform.system(),
                os_version=platform.version(),
                python_version=sys.version,
                node_version=self._get_version('node'),
                npm_version=self._get_version('npm'),
                cpu_count=psutil.cpu_count(logical=True),
                total_memory=psutil.virtual_memory().total / (1024**3),
                free_memory=psutil.virtual_memory().available / (1024**3),
                disk_space=shutil.disk_usage('/').total / (1024**3),
                free_disk=shutil.disk_usage('/').free / (1024**3),
                python_path=sys.executable,
                project_root=Path(__file__).resolve().parent
            )
            
            self.logger.log(
                'INFO',
                f"System Information Collected: {asdict(system_info)}",
                'system'
            )
            return system_info
            
        except Exception as e:
            self.logger.log(
                'ERROR',
                f"Failed to collect system info: {str(e)}",
                'error',
                exc_info=True
            )
            # Returnera dummy-data vid fel
            return SystemInfo(
                os_name="Unknown",
                os_version="Unknown",
                python_version=sys.version,
                node_version=None,
                npm_version=None,
                cpu_count=1,
                total_memory=0.0,
                free_memory=0.0,
                disk_space=0.0,
                free_disk=0.0,
                python_path=sys.executable,
                project_root=Path(__file__).resolve().parent
            )

    def _get_version(self, command: str) -> Optional[str]:
        """Hämta version för ett kommando med timeout"""
        try:
            result = subprocess.run(
                [command, '--version'],
                capture_output=True,
                text=True,
                timeout=5
            )
            return result.stdout.strip() if result.returncode == 0 else None
        except Exception:
            return None

    async def check_ports(self, ports: List[int]) -> Dict[int, bool]:
        """Kontrollera om portar är tillgängliga asynkront"""
        results = {}
        for port in ports:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(1.0)
                result = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: sock.connect_ex(('localhost', port)) != 0
                )
                results[port] = result
            except Exception as e:
                self.logger.log(
                    'WARNING',
                    f"Port check error for port {port}: {str(e)}",
                    'system'
                )
                results[port] = False
            finally:
                sock.close()
        return results

    async def check_service_health(self, url: str, timeout: float = 5.0) -> bool:
        """Kontrollera hälsan för en tjänst"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=timeout) as response:
                    return response.status == 200
        except Exception:
            return False
    
class ProjectManager:
    def __init__(self, logger: EnhancedLogger, monitor: HealthMonitor):
        self.logger = logger
        self.monitor = monitor
        self.processes: Dict[str, subprocess.Popen] = {}
        self.log_queues: Dict[str, queue.Queue] = {}
        self.should_run = True
        self.debug_mode = False
        self.performance_data = []
        self._error_count = 0
        self._max_retries = 3
        self._retry_delay = 5  # sekunder

    async def verify_project_structure(self) -> List[str]:
        """Verifiera projektstruktur med förbättrad kontroll"""
        issues = []
        
        # Definiera nödvändiga strukturer
        required_structure = {
            'directories': {
                'frontend': ['src', 'public', 'node_modules'],
                'backend': ['app', 'static', 'templates'],
                'logs': []
            },
            'files': {
                'frontend': ['package.json', 'vite.config.js'],
                'backend': ['requirements.txt', 'main.py'],
                '.': []
            }
        }

        try:
            # Kontrollera mappar och undermappar
            for main_dir, subdirs in required_structure['directories'].items():
                main_path = Path(main_dir)
                if not main_path.is_dir():
                    issues.append(f"Missing required directory: {main_dir}")
                    continue
                
                for subdir in subdirs:
                    if not (main_path / subdir).is_dir():
                        issues.append(f"Missing subdirectory: {main_dir}/{subdir}")

            # Kontrollera filer
            for dir_name, files in required_structure['files'].items():
                dir_path = Path(dir_name)
                for file in files:
                    if not (dir_path / file).is_file():
                        issues.append(f"Missing required file: {dir_name}/{file}")

            # Logga resultat
            if issues:
                self.logger.log(
                    'WARNING',
                    f"Found {len(issues)} structure issues:\n" + "\n".join(issues),
                    'system'
                )
            else:
                self.logger.log('INFO', "Project structure verified successfully", 'system')

        except Exception as e:
            self.logger.log(
                'ERROR',
                f"Error verifying project structure: {str(e)}",
                'error',
                exc_info=True
            )
            issues.append(f"Structure verification error: {str(e)}")

        return issues

    async def check_dependencies(self, ignore: bool = False) -> bool:
        """Kontrollera och validera alla beroenden med förbättrad felhantering"""
        if ignore:
            self.logger.log("INFO", "Dependency check skipped as requested", "dependency")
            return True

        dependency_issues = []
        
        # Kontrollera Python-beroenden
        try:
            requirements_file = Path("backend/requirements.txt")
            if requirements_file.exists():
                async with aiofiles.open(requirements_file, mode='r') as f:
                    content = await f.read()
                    requirements = [
                        line.strip() 
                        for line in content.split('\n') 
                        if line.strip() and not line.startswith('#')
                    ]

                for req in requirements:
                    try:
                        subprocess.run(
                            [sys.executable, "-m", "pip", "show", req.split('==')[0]],
                            capture_output=True,
                            check=True,
                            timeout=10
                        )
                    except Exception as e:
                        dependency_issues.append(f"Python package issue: {req} - {str(e)}")
            else:
                dependency_issues.append("requirements.txt not found")

        except Exception as e:
            self.logger.log(
                'ERROR',
                f"Error checking Python dependencies: {str(e)}",
                'dependency',
                exc_info=True
            )

        # Kontrollera Node.js-beroenden
        try:
            package_json = Path("frontend/package.json")
            if package_json.exists():
                with open(package_json) as f:
                    package_data = json.load(f)
                
                # Kontrollera node_modules
                if not Path("frontend/node_modules").exists():
                    dependency_issues.append("node_modules directory missing")
                
                # Kontrollera viktiga paket
                for dep_type in ['dependencies', 'devDependencies']:
                    for dep in package_data.get(dep_type, {}):
                        if not (Path("frontend/node_modules") / dep).exists():
                            dependency_issues.append(f"Missing npm package: {dep}")
            else:
                dependency_issues.append("package.json not found")

        except Exception as e:
            self.logger.log(
                'ERROR',
                f"Error checking Node.js dependencies: {str(e)}",
                'dependency',
                exc_info=True
            )

        # Logga resultat
        if dependency_issues:
            self.logger.log(
                'WARNING',
                "Dependency issues found:\n" + "\n".join(dependency_issues),
                'dependency'
            )
        else:
            self.logger.log('INFO', "All dependencies verified successfully", 'dependency')

        # Returnera True även om det finns problem, men logga dem
        return True

    async def start_services(self, ignore_deps: bool = False) -> bool:
        """Starta alla tjänster med förbättrad felhantering och återförsök"""
        try:
            self.logger.log("INFO", "Starting services...", "system")

            # Kontrollera projektstruktur och beroenden
            structure_issues = await self.verify_project_structure()
            if structure_issues and not ignore_deps:
                self.logger.log(
                    "WARNING",
                    "Project structure issues found but continuing...",
                    "system"
                )

            await self.check_dependencies(ignore=ignore_deps)

            # Kontrollera portar
            ports = await self.monitor.check_ports([8000, 5173])
            if not all(ports.values()):
                used_ports = [port for port, available in ports.items() if not available]
                self.logger.log(
                    "WARNING",
                    f"Ports already in use: {used_ports}",
                    "system"
                )

            # Försök starta backend
            for attempt in range(self._max_retries):
                if await self.start_backend():
                    break
                if attempt < self._max_retries - 1:
                    self.logger.log(
                        "WARNING",
                        f"Backend start attempt {attempt + 1} failed, retrying...",
                        "backend"
                    )
                    await asyncio.sleep(self._retry_delay)
            
            # Vänta på att backend ska vara redo
            if not await self.wait_for_backend():
                self.logger.log(
                    "ERROR",
                    "Backend failed to start properly",
                    "backend"
                )
                return False

            # Försök starta frontend
            for attempt in range(self._max_retries):
                if await self.start_frontend():
                    break
                if attempt < self._max_retries - 1:
                    self.logger.log(
                        "WARNING",
                        f"Frontend start attempt {attempt + 1} failed, retrying...",
                        "frontend"
                    )
                    await asyncio.sleep(self._retry_delay)

            return True

        except Exception as e:
            self.logger.log(
                "ERROR",
                f"Unexpected error during service startup: {str(e)}",
                "system",
                exc_info=True
            )
            await self.stop_all()
            return False



    def start_backend(self) -> bool:
        """Starta backend-servern med förbättrad loggning och hantering av portkonflikter."""
        try:
            self.logger.log('INFO', "Kontrollerar port 8000 och stänger aktiva processer...", 'backend')
            kill_process_on_port(8000)

            self.logger.log('INFO', "Starting backend server...", 'backend')
            backend_dir = Path(__file__).resolve().parent / "backend"
            env = os.environ.copy()
            env["PYTHONPATH"] = str(Path("backend").resolve())

            process = subprocess.Popen(
                [sys.executable, "-m", "uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
                cwd=str(backend_dir),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding='utf-8',
                env=env
            )

            # Vänta och logga eventuella problem
            self.logger.log('INFO', "Väntar på att backend ska starta...", 'backend')
            for _ in range(15):  # Väntar upp till 15 sekunder
                if process.poll() is not None:
                    break
                time.sleep(1)

            # Kolla om backend startades framgångsrikt
            if process.poll() is None:  # Processen kör fortfarande
                self.logger.log('INFO', "Backend server är aktiv.", 'backend')
                self.processes['backend'] = process
                return True
            else:
                stderr = process.stderr.read()
                self.logger.log('ERROR', f"Backend kunde inte starta: {stderr}", 'backend')
                return False
        except Exception as e:
            self.logger.log('ERROR', f"Failed to start backend: {str(e)}", 'error')
            return False

    async def start_frontend(self) -> bool:
        """Starta frontend-utvecklingsservern med förbättrad felhantering"""
        try:
            self.logger.log('INFO', "Starting frontend server...", 'frontend')
            
            frontend_dir = Path("frontend").resolve()
            npm_command = "npm.cmd" if sys.platform == "win32" else "npm"
            
            # Kontrollera om node_modules finns, installera om det behövs
            if not (frontend_dir / "node_modules").exists():
                self.logger.log('INFO', "Installing frontend dependencies...", 'frontend')
                subprocess.run(
                    [npm_command, "install"],
                    cwd=str(frontend_dir),
                    check=True,
                    capture_output=True,
                    text=True
                )

            # Starta frontend-utvecklingsservern
            process = subprocess.Popen(
                [npm_command, "run", "dev"],
                cwd=str(frontend_dir),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding='utf-8'
            )
            
            self.processes['frontend'] = process
            
            # Starta loggningshanterare
            self._start_output_handler(process, 'frontend')
            
            # Vänta och verifiera
            await asyncio.sleep(5)
            if process.poll() is not None:
                raise RuntimeError("Frontend process terminated immediately")
            
            self.logger.log('INFO', "Frontend started successfully", 'frontend')
            return True

        except Exception as e:
            self.logger.log(
                'ERROR',
                f"Failed to start frontend: {str(e)}",
                'frontend',
                exc_info=True
            )
            return False

    def _start_output_handler(self, process: subprocess.Popen, name: str):
        """Hantera process-output i separata trådar"""
        def handle_output(stream, log_level):
            try:
                for line in stream:
                    line = line.strip()
                    if line:
                        self.logger.log(log_level, line, name)
            except Exception as e:
                self.logger.log(
                    'ERROR',
                    f"Error handling {name} output: {str(e)}",
                    'error'
                )

        threading.Thread(
            target=handle_output,
            args=(process.stdout, 'INFO'),
            daemon=True
        ).start()
        
        threading.Thread(
            target=handle_output,
            args=(process.stderr, 'ERROR'),
            daemon=True
        ).start()

    async def wait_for_backend(self, timeout: int = 30) -> bool:
        """Vänta på att backend ska svara med timeout och återförsök"""
        start_time = time.time()
        retry_interval = 1  # sekunder mellan försök
        
        while time.time() - start_time < timeout:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        'http://localhost:8000/health',
                        timeout=2
                    ) as response:
                        if response.status == 200:
                            return True
            except Exception:
                pass
            
            await asyncio.sleep(retry_interval)
            
            # Kontrollera om processen fortfarande kör
            if 'backend' in self.processes and self.processes['backend'].poll() is not None:
                self.logger.log(
                    'ERROR',
                    "Backend process has terminated",
                    'backend'
                )
                return False

        self.logger.log(
            'ERROR',
            f"Backend failed to respond within {timeout} seconds",
            'backend'
        )
        return False

    async def stop_all(self):
        """Stoppa alla tjänster med timeout och forcerad avslutning vid behov"""
        for name, process in self.processes.items():
            try:
                self.logger.log('INFO', f"Stopping {name}...", name)
                
                # Försök avsluta snällt först
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    self.logger.log('WARNING', f"Force killing {name}...", name)
                    process.kill()
                    process.wait()
                
                self.logger.log('INFO', f"{name} stopped", name)
            except Exception as e:
                self.logger.log(
                    'ERROR',
                    f"Error stopping {name}: {str(e)}",
                    'error',
                    exc_info=True
                )

    def collect_performance_metrics(self):
        """Samla prestandametriker med förbättrad felhantering"""
        try:
            metrics = {
                'timestamp': datetime.now().isoformat(),
                'cpu_percent': psutil.cpu_percent(interval=1),
                'memory_percent': psutil.virtual_memory().percent,
                'disk_usage': psutil.disk_usage('/').percent,
                'process_metrics': {}
            }

            for name, process in self.processes.items():
                try:
                    if process.poll() is None:  # Process still running
                        proc = psutil.Process(process.pid)
                        metrics['process_metrics'][name] = {
                            'cpu_percent': proc.cpu_percent(),
                            'memory_percent': proc.memory_percent(),
                            'threads': proc.num_threads(),
                            'status': 'running'
                        }
                    else:
                        metrics['process_metrics'][name] = {
                            'status': 'stopped',
                            'return_code': process.returncode
                        }
                except Exception as pe:
                    metrics['process_metrics'][name] = {
                        'status': 'error',
                        'error': str(pe)
                    }

            self.performance_data.append(metrics)
            
            # Behåll endast senaste 1000 mätningar
            if len(self.performance_data) > 1000:
                self.performance_data = self.performance_data[-1000:]

            return metrics

        except Exception as e:
            self.logger.log(
                'ERROR',
                f"Error collecting performance metrics: {str(e)}",
                'performance',
                exc_info=True
            )
            return None

    def generate_report(self) -> Path:
        """Generera en detaljerad utvecklingsrapport"""
        try:
            report_time = datetime.now().strftime('%Y%m%d_%H%M%S')
            report_path = Path('logs') / f'dev_report_{report_time}.json'
            
            report_data = {
                'timestamp': datetime.now().isoformat(),
                'system_info': asdict(self.monitor.collect_system_info()),
                'performance_summary': self._generate_performance_summary(),
                'service_status': {
                    name: 'running' if proc.poll() is None else 'stopped'
                    for name, proc in self.processes.items()
                },
                'errors': self._collect_error_logs(),
                'dependencies': self._check_dependency_status()
            }

            with open(report_path, 'w', encoding='utf-8') as f:
                json.dump(report_data, f, indent=2, default=str)

            self.logger.log('INFO', f"Development report generated: {report_path}", 'system')
            return report_path

        except Exception as e:
            self.logger.log(
                'ERROR',
                f"Error generating report: {str(e)}",
                'error',
                exc_info=True
            )
            return None

    def _generate_performance_summary(self) -> dict:
        """Generera prestandasammanfattning från insamlade data"""
        if not self.performance_data:
            return {}

        try:
            cpu_values = [d['cpu_percent'] for d in self.performance_data]
            memory_values = [d['memory_percent'] for d in self.performance_data]

            return {
                'cpu': {
                    'average': sum(cpu_values) / len(cpu_values),
                    'max': max(cpu_values),
                    'min': min(cpu_values)
                },
                'memory': {
                    'average': sum(memory_values) / len(memory_values),
                    'max': max(memory_values),
                    'min': min(memory_values)
                },
                'samples_count': len(self.performance_data),
                'collection_period': {
                    'start': self.performance_data[0]['timestamp'],
                    'end': self.performance_data[-1]['timestamp']
                }
            }
        except Exception as e:
            self.logger.log(
                'ERROR',
                f"Error generating performance summary: {str(e)}",
                'performance',
                exc_info=True
            )
            return {}

    def _collect_error_logs(self, max_errors: int = 100) -> List[dict]:
        """Samla de senaste felloggarna"""
        try:
            error_log_path = Path('logs') / 'error.log'
            if not error_log_path.exists():
                return []

            errors = []
            with open(error_log_path, 'r', encoding='utf-8') as f:
                for line in f.readlines()[-max_errors:]:
                    if 'ERROR' in line:
                        errors.append({
                            'timestamp': line.split(' - ')[0],
                            'message': line.strip()
                        })
            return errors

        except Exception as e:
            self.logger.log(
                'ERROR',
                f"Error collecting error logs: {str(e)}",
                'error',
                exc_info=True
            )
            return []

    def _check_dependency_status(self) -> dict:
        """Kontrollera status för alla beroenden"""
        try:
            return {
                'python_packages': self._check_python_packages(),
                'node_packages': self._check_node_packages(),
                'system_requirements': self._check_system_requirements()
            }
        except Exception as e:
            self.logger.log(
                'ERROR',
                f"Error checking dependencies: {str(e)}",
                'dependency',
                exc_info=True
            )
            return {}

async def main():
    """Huvudfunktion med förbättrad felhantering och kontroll"""
    import argparse
    parser = argparse.ArgumentParser(description="Start development environment")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode")
    parser.add_argument("--ignore-deps", action="store_true", help="Ignore dependency checks")
    parser.add_argument("--no-browser", action="store_true", help="Don't open browser windows")
    args = parser.parse_args()

    # Initiera huvudkomponenter
    logger = EnhancedLogger(debug_mode=args.debug)
    monitor = HealthMonitor(logger)
    manager = ProjectManager(logger, monitor)

    try:
        # Visa startbanner
        logger.log('INFO', """
╔════════════════════════════════════════╗
║     Hagelskott Development Environment ║
║            Starting Services           ║
╚════════════════════════════════════════╝
        """)

        # Starta tjänster
        if not await manager.start_services(ignore_deps=args.ignore_deps):
            logger.log('ERROR', "Failed to start services", 'system')
            return

        # Öppna webbläsare om det inte är inaktiverat
        if not args.no_browser:
            for url in ['http://localhost:5173', 'http://localhost:8000/docs']:
                try:
                    webbrowser.open(url)
                except Exception as e:
                    logger.log('WARNING', f"Could not open browser for {url}: {str(e)}", 'system')

        # Starta prestandaövervakning
        monitor_task = asyncio.create_task(
            monitor_performance(manager)
        )

        # Huvudloop
        try:
            while True:
                await asyncio.sleep(1)
                if not manager.check_processes():
                    logger.log('ERROR', "Critical service stopped", 'system')
                    break
        except KeyboardInterrupt:
            logger.log('INFO', "Shutting down on user request...", 'system')
        finally:
            # Städa upp
            monitor_task.cancel()
            await manager.stop_all()
            
            # Generera slutrapport
            report_path = manager.generate_report()
            if report_path:
                logger.log('INFO', f"Final report generated: {report_path}", 'system')

    except Exception as e:
        logger.log(
            'ERROR',
            f"Critical error in main: {str(e)}",
            'error',
            exc_info=True
        )
    finally:
        logger.log('INFO', "Development environment shut down", 'system')

async def monitor_performance(manager: ProjectManager):
    """Kontinuerlig prestandaövervakning"""
    while True:
        try:
            manager.collect_performance_metrics()
            await asyncio.sleep(5)
        except asyncio.CancelledError:
            break
        except Exception as e:
            manager.logger.log(
                'ERROR',
                f"Performance monitoring error: {str(e)}",
                'performance',
                exc_info=True
            )
            await asyncio.sleep(10)  # Längre väntetid vid fel

if __name__ == "__main__":
    asyncio.run(main())