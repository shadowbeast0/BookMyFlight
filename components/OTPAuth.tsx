/**
 * OTPAuth Component
 * Stateless phone-based authentication with OTP verification
 * Implements JWT-based authentication without HTTP sessions
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useDeals';
import { Card } from '@/components/ui/card';

interface OTPAuthProps {
  onSuccess: () => void;
}

export function OTPAuth({ onSuccess }: OTPAuthProps) {
  const { sendOTP, verifyOTP, loading, error } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOTP] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSendOTP = async () => {
    try {
      setLocalError(null);
      if (!phoneNumber.match(/^\+?[1-9]\d{1,14}$/)) {
        setLocalError('Please enter a valid phone number');
        return;
      }
      await sendOTP(phoneNumber);
      setStep('otp');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to send OTP');
    }
  };

  const handleVerifyOTP = async () => {
    try {
      setLocalError(null);
      if (otp.length !== 6) {
        setLocalError('OTP must be 6 digits');
        return;
      }
      await verifyOTP(phoneNumber, otp);
      onSuccess();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'OTP verification failed');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">Secure Booking</h2>
          <p className="text-sm text-muted-foreground">Verify with your phone number</p>
        </div>

        {step === 'phone' ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                Phone Number
              </label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  setLocalError(null);
                }}
                disabled={loading}
                className="w-full"
              />
            </div>

            {(error || localError) && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                <p className="text-sm text-destructive font-medium">
                  {error?.message || localError}
                </p>
              </div>
            )}

            <Button
              onClick={handleSendOTP}
              disabled={loading || !phoneNumber}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-secondary/10 rounded-lg p-3 mb-4">
              <p className="text-xs text-secondary-foreground/70">
                OTP sent to <span className="font-semibold">{phoneNumber}</span>
              </p>
            </div>

            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-foreground mb-2">
                One-Time Password
              </label>
              <Input
                id="otp"
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => {
                  setOTP(e.target.value.slice(0, 6));
                  setLocalError(null);
                }}
                disabled={loading}
                maxLength={6}
                className="w-full text-center text-xl tracking-widest font-mono"
              />
            </div>

            {(error || localError) && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                <p className="text-sm text-destructive font-medium">
                  {error?.message || localError}
                </p>
              </div>
            )}

            <Button
              onClick={handleVerifyOTP}
              disabled={loading || otp.length !== 6}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </Button>

            <Button
              onClick={() => {
                setStep('phone');
                setOTP('');
                setLocalError(null);
              }}
              variant="ghost"
              className="w-full text-muted-foreground hover:text-foreground"
              disabled={loading}
            >
              Back
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Your data is secure and encrypted. No passwords required.
        </p>
      </div>
    </Card>
  );
}
