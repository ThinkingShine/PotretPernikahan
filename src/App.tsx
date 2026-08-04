import { useState, useEffect } from "react"
import GuestLanding from "./GuestLanding"
import UploadFlow from "./UploadFlow"
import GalleryScreen from "./GalleryScreen"
import GuestbookScreen from "./GuestbookScreen"
import AdminDashboard from "./AdminDashboard"
import SlideshowScreen from "./SlideshowScreen"
import { fetchEventSettings, FALLBACK_EVENT, type EventSettings } from "./lib/api"

type GuestView = "landing" | "upload" | "gallery" | "guestbook"
type Route = "guest" | "admin" | "slideshow"

function routeFromHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, "").toLowerCase()
  if (hash.startsWith("admin")) return "admin"
  if (hash.startsWith("slideshow")) return "slideshow"
  return "guest"
}

export default function App() {
  const [route, setRoute] = useState<Route>(routeFromHash)
  const [view, setView] = useState<GuestView>("landing")
  const [event, setEvent] = useState<EventSettings>(FALLBACK_EVENT)

  useEffect(() => {
    const onHashChange = () => setRoute(routeFromHash())
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  // Fetched once here so the four guest screens share one request.
  useEffect(() => {
    if (route !== "guest") return
    let cancelled = false
    fetchEventSettings()
      .then(settings => {
        if (!cancelled) setEvent(settings)
      })
      .catch(() => {
        // Keep the fallback headings rather than blanking the page.
      })
    return () => {
      cancelled = true
    }
  }, [route])

  if (route === "admin") return <AdminDashboard />
  if (route === "slideshow") return <SlideshowScreen />

  if (view === "upload") return <UploadFlow event={event} onNavigate={setView} />
  if (view === "gallery") return <GalleryScreen event={event} onNavigate={setView} />
  if (view === "guestbook") return <GuestbookScreen event={event} onNavigate={setView} />
  return <GuestLanding event={event} onNavigate={setView} />
}
