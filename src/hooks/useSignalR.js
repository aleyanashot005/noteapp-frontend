import { useEffect, useRef, useState } from 'react'
import * as signalR from '@microsoft/signalr'
import { supabase } from '../supabaseClient'

const API_URL = import.meta.env.VITE_API_URL

export function useSignalR(onNotification) {
  const connectionRef = useRef(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    let connection

    const start = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      connection = new signalR.HubConnectionBuilder()
        .withUrl(`${API_URL}/hubs/notifications`, {
          accessTokenFactory: () => session.access_token
        })
        .withAutomaticReconnect()
        .build()

      connection.on('ReceiveNotification', (notification) => {
        if (onNotification) onNotification(notification)
      })

      try {
        await connection.start()
        setConnected(true)
        connectionRef.current = connection
      } catch (err) {
        console.error('SignalR connection failed:', err)
      }
    }

    start()

    return () => {
      if (connectionRef.current)
        connectionRef.current.stop()
    }
  }, [])

  return { connected }
}
