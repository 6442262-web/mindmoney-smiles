import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Delete, KeyRound } from 'lucide-react';
import { isValidPinFormat } from '@/lib/pinUtils';

interface PinEntryProps {
  onPinSubmit: (pin: string) => Promise<boolean>;
  title: string;
  subtitle?: string;
  loading?: boolean;
  showForgotPin?: boolean;
  onForgotPin?: () => void;
}

export function PinEntry({ onPinSubmit, title, subtitle, loading = false, showForgotPin = false, onForgotPin }: PinEntryProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleNumberClick = (number: string) => {
    if (pin.length < 6) {
      const newPin = pin + number;
      setPin(newPin);
      setError('');
      
      // Auto submit when 6 digits are entered
      if (newPin.length === 6) {
        handleSubmit(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const handleSubmit = async (pinToSubmit = pin) => {
    if (!isValidPinFormat(pinToSubmit)) {
      setError('กรุณาป้อน PIN 6 หลัก');
      return;
    }

    const success = await onPinSubmit(pinToSubmit);
    if (!success) {
      setPin('');
      setError('PIN ไม่ถูกต้อง');
    }
  };

  const renderPinDots = () => {
    return Array.from({ length: 6 }, (_, index) => (
      <div
        key={index}
        className={`w-4 h-4 rounded-full border-2 transition-colors ${
          index < pin.length
            ? 'bg-primary border-primary'
            : 'border-muted-foreground'
        }`}
      />
    ));
  };

  const numberPad = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    ['', 0, 'backspace']
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-primary/10">
              <KeyRound className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* PIN Dots Display */}
          <div className="flex justify-center space-x-3">
            {renderPinDots()}
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-3">
            {numberPad.flat().map((item, index) => {
              if (item === '') {
                return <div key={index} />; // Empty space
              }
              
              if (item === 'backspace') {
                return (
                  <Button
                    key={index}
                    variant="outline"
                    size="lg"
                    className="h-14 w-full"
                    onClick={handleBackspace}
                    disabled={loading || pin.length === 0}
                  >
                    <Delete className="h-5 w-5" />
                  </Button>
                );
              }

              return (
                <Button
                  key={index}
                  variant="outline"
                  size="lg"
                  className="h-14 w-full text-lg font-semibold"
                  onClick={() => handleNumberClick(item.toString())}
                  disabled={loading}
                >
                  {item}
                </Button>
              );
            })}
          </div>

          {/* Manual Submit Button (if needed) */}
          {pin.length === 6 && (
            <Button 
              className="w-full" 
              onClick={() => handleSubmit()}
              disabled={loading}
            >
              {loading ? 'กำลังตรวจสอบ...' : 'ยืนยัน'}
            </Button>
          )}

          {/* Forgot PIN Button */}
          {showForgotPin && onForgotPin && (
            <Button 
              variant="ghost" 
              className="w-full text-sm"
              onClick={onForgotPin}
              disabled={loading}
            >
              ลืมรหัส PIN?
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}