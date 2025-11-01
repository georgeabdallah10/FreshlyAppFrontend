import { Html5Qrcode } from 'html5-qrcode';
import React, { useEffect, useRef, useState } from 'react';

interface WebBarcodeScannerProps {
  onScan: (result: { data: string; type: string }) => void;
  onError?: (error: string) => void;
}

export default function WebBarcodeScanner({ onScan, onError }: WebBarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scannerId] = useState(`web-barcode-scanner-${Date.now()}`);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isRunningRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    console.log('[WebBarcodeScanner] Component mounted, ID:', scannerId);

    const startScanner = async () => {
      try {
        // Wait for DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 250));
        
        if (!mounted) return;

        console.log('[WebBarcodeScanner] Checking for element:', scannerId);
        const element = document.getElementById(scannerId);
        console.log('[WebBarcodeScanner] Element found:', element);
        
        if (!element) {
          throw new Error('Scanner container element not found in DOM');
        }

        // Create scanner instance
        console.log('[WebBarcodeScanner] Creating Html5Qrcode instance...');
        const scanner = new Html5Qrcode(scannerId);
        scannerRef.current = scanner;

        // Get available cameras
        console.log('[WebBarcodeScanner] Getting camera devices...');
        const devices = await Html5Qrcode.getCameras();
        console.log('[WebBarcodeScanner] Available cameras:', devices);

        if (!devices || devices.length === 0) {
          throw new Error('No cameras found on this device');
        }

        if (!mounted) return;

        // Start scanning with back camera
        console.log('[WebBarcodeScanner] Starting camera...');
        await scanner.start(
          { facingMode: 'environment' }, // Use back camera
          {
            fps: 10, // Frames per second
            qrbox: { width: 250, height: 250 }, // Scanning area
            aspectRatio: 1.0,
          },
          (decodedText, decodedResult) => {
            if (mounted) {
              console.log('[WebBarcodeScanner] Barcode scanned:', decodedText);
              onScan({
                data: decodedText,
                type: decodedResult.result.format?.formatName || 'UNKNOWN',
              });
            }
          },
          (errorMessage) => {
            // Ignore NotFoundException errors (they're frequent when no barcode is visible)
            if (errorMessage && !errorMessage.includes('NotFoundException')) {
              console.debug('[WebBarcodeScanner] Scan error:', errorMessage);
            }
          }
        );

        isRunningRef.current = true;
        console.log('[WebBarcodeScanner] Scanner started successfully');
        
        if (mounted) {
          setLoading(false);
        }
      } catch (err: any) {
        console.error('[WebBarcodeScanner] Failed to start scanner:', err);
        if (mounted) {
          setError(err?.message || 'Failed to start camera');
          setLoading(false);
          if (onError) {
            onError(err?.message || 'Failed to start camera');
          }
        }
      }
    };

    startScanner();

    // Cleanup
    return () => {
      console.log('[WebBarcodeScanner] Cleaning up...');
      mounted = false;
      
      if (scannerRef.current && isRunningRef.current) {
        scannerRef.current
          .stop()
          .then(() => {
            console.log('[WebBarcodeScanner] Scanner stopped');
            isRunningRef.current = false;
            if (scannerRef.current) {
              scannerRef.current.clear();
            }
          })
          .catch((err) => {
            console.error('[WebBarcodeScanner] Error stopping scanner:', err);
          });
      }
    };
  }, [scannerId, onScan, onError]);

  return (
    <div
      style={{
        width: '340px',
        height: '340px',
        margin: '0 auto',
        position: 'relative',
      }}
    >
      {loading && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#FFF',
            fontSize: '16px',
            textAlign: 'center',
            zIndex: 10,
          }}
        >
          Loading camera...
        </div>
      )}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#FF3B30',
            fontSize: '14px',
            textAlign: 'center',
            padding: '20px',
            zIndex: 10,
          }}
        >
          {error}
        </div>
      )}
      <div
        id={scannerId}
        style={{
          width: '340px',
          height: '340px',
          borderRadius: '12px',
          overflow: 'hidden',
          backgroundColor: '#000',
        }}
      />
    </div>
  );
}
