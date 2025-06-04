"use client";

import { useEffect, useState } from "react";
import QRCodeLib from "qrcode";

interface QRCodeProps {
  url: string;
  size?: number;
  className?: string;
}

export const QRCode = ({ url, size = 200, className = "" }: QRCodeProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const generateQR = async () => {
      try {
        const qrUrl = await QRCodeLib.toDataURL(url, {
          width: size,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
        setQrCodeUrl(qrUrl);
        setError("");
      } catch (err) {
        console.error("Ошибка генерации QR-кода:", err);
        setError("Не удалось создать QR-код");
      }
    };

    if (url) {
      generateQR();
    }
  }, [url, size]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ width: size, height: size }}
      >
        <p className="text-sm text-gray-500 text-center px-4">
          Ошибка генерации QR-кода
        </p>
      </div>
    );
  }

  if (!qrCodeUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className={className}>
      <img
        src={qrCodeUrl}
        alt="QR код для списка покупок"
        className="border border-gray-200 rounded-lg"
        width={size}
        height={size}
      />
    </div>
  );
};
