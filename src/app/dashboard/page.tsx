"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { facialRecognitionAttendance } from "@/ai/flows/facial-recognition-attendance";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const router = useRouter();
  const [photo, setPhoto] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if the browser supports the MediaDevices API
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setHasCamera(true);
    } else {
      console.error("getUserMedia is not supported in this browser");
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: "Your browser does not support camera access.",
      });
    }
  }, [toast]);

  const takePhoto = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const videoTrack = stream.getVideoTracks()[0];
    const imageCapture = new ImageCapture(videoTrack);
    const photoBlob = await imageCapture.takePhoto();

    // Convert the Blob to a data URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhoto(reader.result as string);
      videoTrack.stop(); // Stop the camera
    };
    reader.readAsDataURL(photoBlob);
  };

  const markAttendance = async () => {
    if (!photo) {
      toast({
        variant: "destructive",
        title: "Missing Photo",
        description: "Please take a photo before marking attendance.",
      });
      return;
    }

    const userId = "user123"; // Replace with actual user ID
    const result = await facialRecognitionAttendance({ photoUrl: photo, userId: userId });

    if (result.isAuthenticated) {
      toast({
        title: "Attendance Marked",
        description: `Attendance marked with confidence: ${result.confidence.toFixed(2)}`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Authentication Failed",
        description: `Facial recognition failed. Confidence: ${result.confidence.toFixed(2)}`,
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary">
      <Card className="w-96 p-4">
        <CardHeader>
          <CardTitle className="text-lg">Attendance Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasCamera ? (
            <>
              <div className="relative w-full h-48 bg-muted rounded-md overflow-hidden">
                {photo ? (
                  <img src={photo} alt="Your Photo" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    No photo taken yet
                  </div>
                )}
              </div>
              <div className="flex justify-between">
                <Button onClick={takePhoto} disabled={!hasCamera} variant="outline">
                  <Icons.camera className="w-4 h-4 mr-2" />
                  Take Photo
                </Button>
                <Button onClick={markAttendance} disabled={!photo} >
                  Mark Attendance
                </Button>
              </div>
            </>
          ) : (
            <div className="text-red-500">Camera not available.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
