import { Link } from "@tanstack/react-router";
import { Network, Clock, RefreshCw } from "lucide-react"
import { useEffect, useState, type ReactNode, type MouseEvent } from "react";
import Card from "./components/Layout/Card/Card";
import type { QueryObserverResult, RefetchOptions } from "@tanstack/react-query";
import type { TDevices } from "./App.types";

type refetchFunction = (options?: RefetchOptions | undefined) => Promise<QueryObserverResult<NoInfer<TDevices>, Error>>;

export default function Layout({
  children, title, isRefreshLoading, refetch
}: { children: ReactNode, title?: string, isRefreshLoading?:boolean, refetch?:refetchFunction }) {
  const [connected, setConnected] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<Date>();
  const handleRefetchButton = (event:MouseEvent<HTMLButtonElement>, reGet:refetchFunction) => {
    event.preventDefault();
    reGet();
    console.log('test');
  }
  useEffect(() => {
        setConnected(navigator.onLine);
        setLastUpdate(new Date());
  }, [navigator.onLine]);
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="bg-gray-800 border-b border-gray-700 shadow-lg px-8">
        <div className="mx-auto py-4">
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
      <main className="grid grid-cols-5 gap-4 my-4 mx-8">
        <div className="col-span-4 col-start-2 flex w-full">
          {title? <h2 className="flex-1 justify-between text-2xl font-bold">{title}</h2> : null}
          
          {isRefreshLoading &&  refetch? <button
        onClick={(e) => handleRefetchButton(e, refetch)}
        disabled={isRefreshLoading}
        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
    >
        <RefreshCw className={`w-4 h-4 ${isRefreshLoading ? 'animate-spin' : ''}`} />
        <span>Refresh</span>
    </button> : null}
        </div>
        <aside className="row-start-2">
          <Card>
            <nav className="flex flex-col gap-2 bg-gray-800 rounded-lg p-2 border border-gray-900">
                <Link to="/" className=" p-2 [&.active]:font-bold [&.active]:bg-gray-700">
                  Home
                </Link>
                <Link to="/Devices" className=" p-2 [&.active]:font-bold [&.active]:bg-gray-700">
                  Devices
                </Link>
                <Link to="/DNS" className=" p-2 [&.active]:font-bold [&.active]:bg-gray-700">
                  DNS Lookup
                </Link>
                <Link to="/Traceroute" className=" p-2 [&.active]:font-bold [&.active]:bg-gray-700">
                  Traceroute
                </Link>
            </nav>
          </Card>
        </aside>
        <div className="col-span-4 row-start-2">
          {children}
        </div>
      </main>
      <footer className="bg-gray-800 border-t border-gray-700 mt-12">
        <div className="container mx-auto px-4 py-4 text-center text-gray-400 text-sm">
          Network Diagnostics • Local Access Only
        </div>
      </footer>
    </div>
  )
}