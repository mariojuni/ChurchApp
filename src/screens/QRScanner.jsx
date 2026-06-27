import React, { useState, useRef } from 'react';
import { QrCode, RefreshCw, X } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Html5Qrcode } from 'html5-qrcode';

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const QRScanner = ({ setActiveTab, members, showToast }) => {
  const [scanLoading, setScanLoading] = useState(false);
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleScan = async (result) => {
    if (!result || !result[0] || scanLoading) return;
    const decodedText = result[0].rawValue;

    setScanLoading(true);

    try {
      // Parse format qr-[id]
      const match = decodedText.match(/qr-([a-zA-Z0-9_-]+)/);
      if (!match || !match[1]) {
        if (showToast) showToast("Invalid QR Code. Does not match system signature.", "error");
        setTimeout(() => setScanLoading(false), 2000);
        return;
      }
      
      const memberId = match[1];
      const foundMember = members.find(m => m.id === memberId);
      
      if (foundMember) {
        // Query firestore to check if already checked in today
        const checkinsRef = collection(db, 'attendance');
        const q = query(
          checkinsRef, 
          where('userId', '==', memberId),
          where('date', '==', getTodayStr()),
          where('type', '==', 'member')
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          if (showToast) showToast(`⚠️ ${foundMember.name} is already checked in for today.`);
          setTimeout(() => setScanLoading(false), 3000);
          return;
        }

        // Write checkin record
        await addDoc(checkinsRef, {
          userId: foundMember.id,
          name: foundMember.name,
          role: foundMember.role,
          status: foundMember.status,
          date: getTodayStr(),
          timestamp: serverTimestamp(),
          type: 'member'
        });

        if (showToast) showToast(`🎉 ${foundMember.name} checked in successfully!`);
        setTimeout(() => setScanLoading(false), 3000);
      } else {
        if (showToast) showToast("Member signature not found in system directory.", "error");
        setTimeout(() => setScanLoading(false), 3000);
      }
    } catch (err) {
      console.error("Error decoding QR:", err);
      if (showToast) showToast("Error processing QR Code.", "error");
      setTimeout(() => setScanLoading(false), 3000);
    }
  };

  const handleError = (error) => {
    console.error("Camera error:", error);
    if (error?.name === 'NotAllowedError' || error?.message?.includes('Permission')) {
      if (showToast) showToast("Camera permission denied. Please allow camera access.", "error");
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setScanLoading(true);
    try {
      const html5QrCode = new Html5Qrcode("hidden-file-reader");
      const decodedText = await html5QrCode.scanFile(file, false);
      html5QrCode.clear(); // cleanup
      
      // Pass the decoded text to our existing handler
      handleScan([{ rawValue: decodedText }]);
    } catch (err) {
      console.error("Error reading file:", err);
      if (showToast) showToast("Could not find a valid QR code in that image.", "error");
      setScanLoading(false);
    }
    
    // Reset input so they can upload the same file again if they want
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100vw', maxWidth: '400px', height: '100vh', maxHeight: '850px', zIndex: 99999, display: 'flex', flexDirection: 'column', background: '#000', color: '#fff', overflow: 'hidden', boxShadow: '0 0 40px rgba(0,0,0,0.5)' }}>
      
      {/* Hidden Div for html5-qrcode scanFile processing */}
      <div id="hidden-file-reader" style={{ display: 'none' }}></div>

      {/* Hidden File Input */}
      <input 
        type="file" 
        accept="image/*" 
        style={{ display: 'none' }} 
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      {/* React QR Scanner Component */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <Scanner 
          onScan={handleScan}
          onError={handleError}
          paused={scanLoading}
          components={{
            audio: false,
            onOff: true,
            torch: true,
            zoom: true,
            finder: false, // We use our own custom finder
          }}
          styles={{
            container: { width: '100%', height: '100%' },
            video: { objectFit: 'cover', width: '100%', height: '100%' }
          }}
        />
      </div>

      {/* Semi-transparent overlay to darken the edges */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.7) 100%)', zIndex: 1, pointerEvents: 'none' }} />
      
      {/* Animated Scan Line */}
      {!scanLoading && (
        <div style={{
          position: 'absolute', width: '100%', height: '3px', background: 'rgba(255, 101, 150, 0.9)',
          boxShadow: '0 0 20px rgba(255, 101, 150, 0.9)', animation: 'scanLineFullscreen 3s ease-in-out infinite', zIndex: 2, pointerEvents: 'none'
        }} />
      )}
      
      {/* Targeting Box Overlay */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '250px', height: '250px', border: '2px solid rgba(255, 255, 255, 0.3)', borderRadius: '24px', zIndex: 2, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '40px', height: '40px', borderTop: '4px solid #4ADE80', borderLeft: '4px solid #4ADE80', borderTopLeftRadius: '24px' }} />
        <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '40px', height: '40px', borderTop: '4px solid #4ADE80', borderRight: '4px solid #4ADE80', borderTopRightRadius: '24px' }} />
        <div style={{ position: 'absolute', bottom: '-2px', left: '-2px', width: '40px', height: '40px', borderBottom: '4px solid #4ADE80', borderLeft: '4px solid #4ADE80', borderBottomLeftRadius: '24px' }} />
        <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '40px', height: '40px', borderBottom: '4px solid #4ADE80', borderRight: '4px solid #4ADE80', borderBottomRightRadius: '24px' }} />
      </div>
      
      {/* Floating Header UI */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', paddingTop: 'max(env(safe-area-inset-top), 24px)' }}>
        <button 
          onClick={() => setActiveTab('attendance')} 
          style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', backdropFilter: 'blur(10px)' }}
        >
          <X size={24} />
        </button>
      </div>

      {/* Floating Center UI (Loading / Status) */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '0 32px', pointerEvents: 'none' }}>
        {scanLoading && (
          <div style={{ background: 'rgba(0,0,0,0.6)', padding: '24px', borderRadius: '24px', backdropFilter: 'blur(10px)', textAlign: 'center' }}>
            <RefreshCw className="spinner" size={48} style={{ color: 'var(--primary)', marginBottom: '16px', animation: 'spin 1.5s linear infinite' }} />
            <p style={{ fontSize: '16px', color: '#fff', fontWeight: 'bold' }}>Processing...</p>
          </div>
        )}
      </div>

      {/* Floating Bottom UI */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, padding: '24px', paddingBottom: 'max(env(safe-area-inset-bottom), 32px)', display: 'flex', flexDirection: 'column', gap: '16px', background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)' }}>
        <button 
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.click();
            }
          }}
          disabled={scanLoading}
          style={{ width: '100%', padding: '20px', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', borderRadius: '100px', fontWeight: 'bold', background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', backdropFilter: 'blur(10px)' }}
        >
          <QrCode size={22} /> Upload QR
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scanLineFullscreen { 0% { top: 10%; } 50% { top: 90%; } 100% { top: 10%; } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
};

export default QRScanner;
