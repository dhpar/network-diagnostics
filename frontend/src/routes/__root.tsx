import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

const RootLayout = () => (
  <>
    <div className="p-2 flex gap-2">
      <Link to="/" className="[&.active]:font-bold">
        Home
      </Link>
      <Link to="/Devices" className="[&.active]:font-bold">
        Devices
      </Link>
      <Link to="/DNS" className="[&.active]:font-bold">
        DNS Lookup
      </Link>
      <Link to="/Traceroute" className="[&.active]:font-bold">
        Traceroute
      </Link>
    </div>
    <hr />
    <Outlet />
    <TanStackRouterDevtools />
  </>
)

export const Route = createRootRoute({ component: RootLayout })