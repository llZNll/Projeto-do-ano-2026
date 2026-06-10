document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================
    // 1. DADOS DA TABELA (COM BOOTSTRAP ICONS)
    // ==========================================
    const devicesData = [
        { name: "DB Server", icon: "bi-database", ip: "192.168.1.10", uptime: "26d 11h", latency: 24, status: "Online" },
        { name: "Office Laptop - 03", icon: "bi-laptop", ip: "192.168.1.145", uptime: "8h 23m", latency: 28, status: "Online" },
        { name: "Wi-Fi Access Point", icon: "bi-router", ip: "192.168.1.55", uptime: "15d 4h", latency: 31, status: "Online" },
        { name: "Web Server", icon: "bi-server", ip: "192.168.1.22", uptime: "12d 7h", latency: 27, status: "Online" },
        { name: "Desktop Workstation", icon: "bi-display", ip: "192.168.1.87", uptime: "3h 55m", latency: 19, status: "Online" }
    ];

    const tbody = document.querySelector("#devicesTable tbody");

    devicesData.forEach(device => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>
                <div class="device-name">
                    <i class="bi ${device.icon} device-icon"></i>
                    ${device.name}
                </div>
            </td>
            <td>${device.ip}</td>
            <td>${device.uptime}</td>
            <td>${device.latency} ms <span class="trend up"><i class="bi bi-arrow-up-short"></i></span></td>
            <td><span class="status-pill">${device.status}</span></td>
            <td><button class="more-btn"><i class="bi bi-three-dots"></i></button></td>
        `;
        tbody.appendChild(row);
    });

    // ==========================================
    // 2. MOTOR DE GRÁFICO REALISTA TIME-SERIES
    // ==========================================
    const canvas = document.getElementById('latencyChart');
    const ctx = canvas.getContext('2d');
    
    // Resize Dinâmico HDPI
    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Estado do Gráfico (Janela de 10 segundos)
    const TIME_WINDOW = 10000; 
    let dataPoints = [];
    let peakLatency = 102;
    let avgLatency = 27;
    
    // Gerador de Dados de Rede Simulada
    function addDataPoint() {
        const now = Date.now();
        let newValue;

        if (dataPoints.length === 0) {
            newValue = 23; // Baseline inicial
        } else {
            const lastValue = dataPoints[dataPoints.length - 1].value;
            // Jitter normal da rede (+- 3ms)
            const jitter = (Math.random() - 0.5) * 6;
            newValue = lastValue + jitter;
            
            // Simulação de Picos ocasionais (Spikes de lag)
            if (Math.random() > 0.96) newValue += Math.random() * 40 + 20; 
            
            // Retorno rápido à normalidade se estiver alto
            if (lastValue > 40 && Math.random() > 0.3) newValue -= 20;

            // Limites (Nunca menor que 10ms, limitando visual para ~120ms)
            newValue = Math.max(10, Math.min(120, newValue)); 
        }

        dataPoints.push({ time: now, value: newValue });

        // Atualiza a UI com o último valor
        const roundedVal = Math.round(newValue);
        document.getElementById('main-latency-val').innerText = roundedVal;
        document.getElementById('top-latency-val').innerText = roundedVal;
        
        if (roundedVal > peakLatency) {
            peakLatency = roundedVal;
            document.getElementById('peak-latency-val').innerText = peakLatency;
        }

        // Limpa dados antigos fora da janela de tempo visível
        dataPoints = dataPoints.filter(dp => now - dp.time <= TIME_WINDOW + 1000);
    }

    // Loop de Inserção de Dados (Ex: pinga a cada 600ms)
    setInterval(addDataPoint, 600);
    addDataPoint(); // Ponto inicial

    // Loop de Renderização (60 FPS contínuo)
    function drawChart() {
        const rect = canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const now = Date.now();
        
        ctx.clearRect(0, 0, width, height);

        // Grade de Fundo
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i = 1; i < 4; i++) {
            let y = (height / 4) * i;
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();

        if (dataPoints.length < 2) {
            requestAnimationFrame(drawChart);
            return;
        }

        // Lógica de mapeamento Temporal -> Espacial
        ctx.beginPath();
        const maxVal = 120; // Y Scale Max

        // Ponto de início do desenho baseado no tempo
        dataPoints.forEach((p, index) => {
            // Calcula o X baseado no tempo que passou relativo à janela de 10s
            const timeDiff = now - p.time; 
            const x = width - (timeDiff / TIME_WINDOW) * width;
            
            // Inverte o Y pois 0 no canvas é o topo
            const y = height - (p.value / maxVal) * height;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                // Curva Suave de Bezier simplificada para realismo
                const prevP = dataPoints[index - 1];
                const prevTimeDiff = now - prevP.time;
                const prevX = width - (prevTimeDiff / TIME_WINDOW) * width;
                const prevY = height - (prevP.value / maxVal) * height;
                
                const cpX = (prevX + x) / 2;
                ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
            }
        });

        // Extensão visual (faz o gráfico não quebrar na borda direita)
        const lastP = dataPoints[dataPoints.length - 1];
        const lastY = height - (lastP.value / maxVal) * height;
        ctx.lineTo(width, lastY);

        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Preenchimento de Gradiente Realista
        ctx.lineTo(width, height);
        
        const firstP = dataPoints[0];
        const firstTimeDiff = now - firstP.time;
        const firstX = width - (firstTimeDiff / TIME_WINDOW) * width;
        ctx.lineTo(firstX, height);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(249, 115, 22, 0.35)');
        gradient.addColorStop(1, 'rgba(249, 115, 22, 0.0)');

        ctx.fillStyle = gradient;
        ctx.fill();

        requestAnimationFrame(drawChart);
    }

    // Inicia render
    requestAnimationFrame(drawChart);
});