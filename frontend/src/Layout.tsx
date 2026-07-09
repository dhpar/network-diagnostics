import { Network, Clock } from "lucide-react"
import { useEffect, useState, type Dispatch, type ReactNode } from "react";
import type { TabType } from "./App.types";

export default function Layout({
  activeTab,
  setActiveTab,
  children,
}: {
  activeTab:TabType
  setActiveTab: Dispatch<TabType>
  children: ReactNode
}) {
  const [connected, setConnected] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<Date>();
  const tabNames = ['dashboard', 'devices', 'wifi', 'DNS'] as TabType[];
  useEffect(() => {
        setConnected(navigator.onLine);
        setLastUpdate(new Date());
  }, [navigator.onLine]);
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="bg-gray-800 border-b border-gray-700 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Network className="w-8 h-8 text-blue-400" />
              <h1 className="text-2xl font-bold">Network Diagnostics</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-400">{connected ? 'Connected' : 'Disconnected'}</span>
              </div>
              {lastUpdate && (
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>Updated: {lastUpdate.toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex space-x-1">
            {tabNames.map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab)
                }}
                className={`px-6 py-3 font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  )
}