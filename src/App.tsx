/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AppPage } from './types/system';
import { SnapshotData } from './types/camera';
import { StorageMetrics } from './types/recording';
import { useTheme } from './hooks/useTheme';
import { useActivityLog } from './hooks/useActivityLog';
import { useCamera } from './hooks/useCamera';
import { useRecording } from './hooks/useRecording';
import { StorageService } from './services/storageService';
import { RecordingService } from './services/recordingService';

// Layout components
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { NotificationModal } from './components/layout/NotificationModal';
import { SnapshotModal } from './components/camera/SnapshotModal';

// Pages
import { Dashboard } from './pages/Dashboard';
import { LiveMonitoring } from './pages/LiveMonitoring';
import { Playback } from './pages/Playback';
import { Cameras } from './pages/Cameras';
import { MotionDetection } from './pages/MotionDetection';
import { StorageManager } from './pages/StorageManager';
import { RecordingSchedule } from './pages/RecordingSchedule';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

export default function App() {
  const { theme, setTheme } = useTheme();
  const { logs, addLog, clearLogs } = useActivityLog();

  const [activePage, setActivePage] = useState<AppPage>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return StorageService.getSettings().sidebarCollapsed || false;
  });
  const [activeSnapshot, setActiveSnapshot] = useState<SnapshotData | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [storageMetrics, setStorageMetrics] = useState<StorageMetrics | null>(null);

  // Initialize camera system with activity logger
  const camera = useCamera({
    onLog: addLog,
  });

  // Initialize Phase 2 recording engine
  const recording = useRecording({
    onLog: addLog,
  });

  const refreshStorageMetrics = useCallback(async () => {
    try {
      const data = await RecordingService.getStorageMetrics();
      setStorageMetrics(data);
    } catch (e) {
      console.warn('Gagal memuat metrik penyimpanan:', e);
    }
  }, []);

  useEffect(() => {
    refreshStorageMetrics();
  }, [refreshStorageMetrics, recording.isRecording]);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      StorageService.saveSettings({ sidebarCollapsed: next });
      return next;
    });
  };

  const handleTakeSnapshot = () => {
    const snap = camera.captureSnapshot();
    if (snap) {
      setActiveSnapshot(snap);
      refreshStorageMetrics();
    }
  };

  const selectedDevice = camera.devices.find((d) => d.deviceId === camera.selectedDeviceId) || camera.devices[0];

  const handleStartRecording = async () => {
    const devId = selectedDevice?.deviceId || 'default';
    const devLabel = selectedDevice?.label || 'Webcam';

    // If stream is not active, initialize camera preview first
    if (!camera.stream || camera.status !== 'streaming') {
      try {
        await camera.startPreview();
      } catch (e) {
        addLog('recording', 'Gagal Memulai Kamera', 'Sensor kamera tidak dapat diaktifkan untuk perekaman', 'error');
        return;
      }
    }

    try {
      await recording.startRecording(
        devId,
        devLabel,
        camera.resolution,
        camera.fps,
        camera.stream
      );
    } catch (err) {
      console.warn('Perekaman gagal dimulai:', err);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors">
      {/* 1. Left Sidebar */}
      <Sidebar
        activePage={activePage}
        onSelectPage={setActivePage}
        isCollapsed={isSidebarCollapsed}
      />

      {/* 2. Main Workstation Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <Header
          activePage={activePage}
          theme={theme}
          onThemeChange={setTheme}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
          cameraStatus={camera.status}
          unreadLogsCount={logs.length}
          onOpenNotifications={() => setIsNotificationOpen(true)}
          isRecording={recording.isRecording}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {activePage === 'dashboard' && (
              <Dashboard
                devices={camera.devices}
                selectedDeviceId={camera.selectedDeviceId}
                onDeviceChange={camera.changeDevice}
                status={camera.status}
                stream={camera.stream}
                error={camera.error}
                metrics={camera.metrics}
                onStart={() => camera.startPreview()}
                onStop={camera.stopPreview}
                onSnapshot={handleTakeSnapshot}
                onRefreshDevices={() => camera.refreshDevices()}
                onVideoElementReady={camera.updateMetricsFromVideo}
                logs={logs}
                onClearLogs={clearLogs}
                onNavigateToLive={() => setActivePage('live')}
                recordingState={recording.recordingState}
                storageMetrics={storageMetrics}
                onStartRecording={handleStartRecording}
                onRequestStopRecording={recording.requestStop}
              />
            )}

            {activePage === 'live' && (
              <LiveMonitoring
                devices={camera.devices}
                selectedDeviceId={camera.selectedDeviceId}
                onDeviceChange={camera.changeDevice}
                resolution={camera.resolution}
                onResolutionChange={camera.changeResolution}
                fps={camera.fps}
                onFpsChange={camera.changeFps}
                status={camera.status}
                stream={camera.stream}
                error={camera.error}
                metrics={camera.metrics}
                onStart={() => camera.startPreview()}
                onStop={camera.stopPreview}
                onSnapshot={handleTakeSnapshot}
                onRefreshDevices={() => camera.refreshDevices()}
                onVideoElementReady={camera.updateMetricsFromVideo}
                recordingState={recording.recordingState}
                onStartRecording={handleStartRecording}
                onRequestStopRecording={recording.requestStop}
                onConfirmStopRecording={recording.confirmStop}
                onCancelStopRecording={recording.cancelStop}
                isStopConfirmOpen={recording.confirmStopOpen}
              />
            )}

            {activePage === 'playback' && <Playback />}

            {activePage === 'cameras' && (
              <Cameras
                devices={camera.devices}
                selectedDeviceId={camera.selectedDeviceId}
                onSelectDevice={camera.changeDevice}
                status={camera.status}
                stream={camera.stream}
                error={camera.error}
                metrics={camera.metrics}
                onStart={() => camera.startPreview()}
                onStop={camera.stopPreview}
                onRefreshDevices={() => camera.refreshDevices()}
                onVideoElementReady={camera.updateMetricsFromVideo}
                isDetecting={camera.isDetecting}
              />
            )}

            {activePage === 'motion' && <MotionDetection />}

            {activePage === 'storage' && <StorageManager />}

            {activePage === 'schedule' && <RecordingSchedule />}

            {activePage === 'reports' && <Reports logs={logs} onClearLogs={clearLogs} />}

            {activePage === 'settings' && (
              <Settings
                theme={theme}
                onThemeChange={setTheme}
                isSidebarCollapsed={isSidebarCollapsed}
                onToggleSidebar={handleToggleSidebar}
                onLog={addLog}
              />
            )}
          </div>
        </main>

        {/* Status Bar */}
        <StatusBar
          status={camera.status}
          metrics={camera.metrics}
          selectedDeviceLabel={selectedDevice?.label}
          totalDevices={camera.devices.length}
          isRecording={recording.isRecording}
          recordingElapsed={recording.recordingState.elapsedSeconds}
          activeCodec={recording.recordingState.activeCodec}
        />
      </div>

      {/* Snapshot Preview Modal */}
      <SnapshotModal
        snapshot={activeSnapshot}
        onClose={() => setActiveSnapshot(null)}
      />

      {/* Notifications Drawer Modal */}
      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        logs={logs}
        onClearLogs={clearLogs}
      />
    </div>
  );
}
