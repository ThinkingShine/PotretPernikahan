import { useState, useEffect } from "react"
import GuestLanding from "./GuestLanding"
import UploadFlow from "./UploadFlow"
import GalleryScreen from "./GalleryScreen"
import GuestbookScreen from "./GuestbookScreen"
import AdminDashboard from "./AdminDashboard"
import SlideshowScreen from "./SlideshowScreen"

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

  useEffect(() => {
    const onHashChange = () => setRoute(routeFromHash())
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  if (route === "admin") return <AdminDashboard />
  if (route === "slideshow") return <SlideshowScreen />

  if (view === "upload") return <UploadFlow onNavigate={setView} />
  if (view === "gallery") return <GalleryScreen onNavigate={setView} />
  if (view === "guestbook") return <GuestbookScreen onNavigate={setView} />
  return <GuestLanding onNavigate={setView} />
}
