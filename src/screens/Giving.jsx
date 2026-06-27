import React, { useRef } from 'react';
import { Download } from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

const Giving = ({ theme }) => {
  const lineChartRef = useRef(null);
  const doughnutRef = useRef(null);

  const lineData = {
    labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
    datasets: [
      {
        fill: true,
        label: 'Giving',
        data: [35000, 38000, 36500, 41000, 39000, 42180],
        borderColor: '#8B6FE8',
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 180);
          gradient.addColorStop(0, 'rgba(139, 111, 232, 0.4)');
          gradient.addColorStop(1, 'rgba(139, 111, 232, 0.0)');
          return gradient;
        },
        tension: 0.4,
        borderWidth: 3,
        pointBackgroundColor: '#FFFFFF',
        pointBorderColor: '#8B6FE8',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: theme === 'dark' ? '#261D42' : '#FFFFFF',
        titleColor: theme === 'dark' ? '#FFFFFF' : '#1A1330',
        bodyColor: theme === 'dark' ? '#B0A6CC' : '#6A6085',
        borderColor: 'rgba(139, 111, 232, 0.1)',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        usePointStyle: true,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: theme === 'dark' ? '#B0A6CC' : '#6A6085', font: { size: 12 } }
      },
      y: {
        border: { display: false },
        grid: { color: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(139, 111, 232, 0.1)' },
        ticks: { color: theme === 'dark' ? '#B0A6CC' : '#6A6085', stepSize: 5000 }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  const doughnutData = {
    labels: ['General', 'Missions', 'Building'],
    datasets: [
      {
        data: [75, 15, 10],
        backgroundColor: ['#FF5FA0', '#8B6FE8', '#4D7FFF'],
        borderWidth: 0,
        hoverOffset: 4
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: theme === 'dark' ? '#261D42' : '#FFFFFF',
        titleColor: theme === 'dark' ? '#FFFFFF' : '#1A1330',
        bodyColor: theme === 'dark' ? '#B0A6CC' : '#6A6085',
        borderColor: 'rgba(139, 111, 232, 0.1)',
        borderWidth: 1,
        padding: 8,
      }
    }
  };

  return (
    <section className="screen">
      <header className="top-bar glass">
        <h1>Giving</h1>
        <button className="icon-button"><Download size={20} /></button>
      </header>
      <div className="scroll-content">
        
        <div className="card hero-giving">
          <p>Total This Month</p>
          <h2>$42,180.50</h2>
          <div className="goal-bar">
            <div className="goal-progress" style={{width: '84%'}}></div>
          </div>
          <p className="goal-text">84% of $50,000 goal</p>
        </div>
        
        <div className="bento-grid">
          <div className="card chart-card-small">
            <h4>Breakdown</h4>
            <div className="doughnut-container">
              <Doughnut ref={doughnutRef} options={doughnutOptions} data={doughnutData} />
            </div>
          </div>
          <div className="card list-card-small">
            <h4>Funds</h4>
            <div className="fund-list">
              <div className="fund-item">
                <span className="dot pink"></span> General <span>75%</span>
              </div>
              <div className="fund-item">
                <span className="dot purple"></span> Missions <span>15%</span>
              </div>
              <div className="fund-item">
                <span className="dot blue"></span> Building <span>10%</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card chart-card">
          <div className="card-header">
            <h3>Giving Trend</h3>
          </div>
          <div className="chart-container">
            <Line ref={lineChartRef} options={lineOptions} data={lineData} />
          </div>
        </div>
        
        <div className="bottom-spacer" style={{height: 100}}></div>
      </div>
    </section>
  );
};

export default Giving;
