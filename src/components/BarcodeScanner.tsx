import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScanLine, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface BarcodeScannerProps {
  onScanSuccess: (result: string) => void;
  onError?: (error: string) => void;
}

export default function BarcodeScanner({ onScanSuccess, onError }: BarcodeScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameras, setCameras] = useState<{id: string, label: string}[]>([]);

  useEffect(() => {
    // Get available cameras when component mounts
    Html5Qrcode.getCameras().then(devices => {
      setCameras(devices);
    }).catch(err => {
      console.warn('No cameras found:', err);
    });

    return () => {
      // Cleanup scanner when component unmounts
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [isScanning]);

  const startScanning = async () => {
    if (!cameras.length) {
      toast({
        title: "No Camera Found",
        description: "Please ensure your device has a camera and grant permission to access it.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsScanning(true);
      
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      // Try back camera first, fallback to any available camera
      let cameraId: string | { facingMode: string } = { facingMode: "environment" };
      if (cameras.length > 0) {
        // Use the first available camera as fallback
        const backCamera = cameras.find(camera => 
          camera.label && camera.label.toLowerCase().includes('back')
        );
        cameraId = backCamera ? backCamera.id : cameras[0].id;
      }

      await scanner.start(
        cameraId,
        config,
        (decodedText) => {
          // Success callback
          onScanSuccess(decodedText);
          stopScanning();
          setIsOpen(false);
          toast({
            title: "Scan Successful!",
            description: "Barcode has been captured and added to the form.",
          });
        },
        (error) => {
          // Error callback - ignore frequent scan errors
          if (onError && !error.includes('NotFoundException')) {
            onError(error);
          }
        }
      );
    } catch (err) {
      const error = err as Error;
      setIsScanning(false);
      toast({
        title: "Scanner Error",
        description: err.message || "Failed to start the scanner. Please try again.",
        variant: "destructive",
      });
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setIsScanning(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  const handleDialogClose = () => {
    if (isScanning) {
      stopScanning();
    }
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2">
          <ScanLine className="h-4 w-4" />
          Scan Barcode
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Scan Barcode/QR Code
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDialogClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Position the barcode or QR code within the scanning area below.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          
          <div className="flex flex-col items-center space-y-4">
            {!isScanning ? (
              <div className="space-y-4 text-center">
                <div className="w-64 h-64 border-2 border-dashed border-border rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <ScanLine className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click "Start Scanning" to begin
                    </p>
                  </div>
                </div>
                <Button onClick={startScanning} className="w-full">
                  Start Scanning
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div id="qr-reader" className="w-full"></div>
                <Button onClick={stopScanning} variant="outline" className="w-full">
                  Stop Scanning
                </Button>
              </div>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground text-center">
            Make sure to allow camera access when prompted by your browser.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}