import React from 'react';

const TestDashboard: React.FC = () => {
  console.log('TestDashboard is rendering!');
  
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0A0A0F 0%, #1A1A2E 50%, #16213E 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#00FFFF',
      fontFamily: 'Orbitron, sans-serif',
      textAlign: 'center',
      padding: '20px'
    }}>
      <div>
        <h1 style={{ 
          fontSize: '4rem', 
          margin: '0 0 20px 0',
          textShadow: '0 0 20px #00FFFF'
        }}>
          🚀 GAMIFYX DASHBOARD 🚀
        </h1>
        <h2 style={{ 
          color: '#FF0080', 
          fontSize: '2rem',
          textShadow: '0 0 15px #FF0080'
        }}>
          Cyberpunk AIOps Platform
        </h2>
        <p style={{ 
          color: '#FFFFFF', 
          fontSize: '1.2rem',
          marginTop: '30px'
        }}>
          ✨ Dashboard is loading successfully! ✨
        </p>
      </div>
    </div>
  );
};

export default TestDashboard;