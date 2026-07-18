import { Link } from "react-router-dom";
import { Home, MessageCircleOff } from "lucide-react";

const NotFound = () => (
  <main className="min-h-[100dvh] flex items-center justify-center bg-base-100 px-4">
    <section className="max-w-md text-center">
      <MessageCircleOff className="mx-auto size-14 text-primary" aria-hidden="true" />
      <h1 className="mt-5 text-4xl font-bold">Page not found</h1>
      <p className="mt-3 text-base-content/70">The page you requested does not exist or may have moved.</p>
      <Link to="/" className="btn btn-primary mt-6 gap-2">
        <Home className="size-4" aria-hidden="true" />
        Return home
      </Link>
    </section>
  </main>
);

export default NotFound;
