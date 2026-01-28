(() => {
    window.Stru = window.Stru || {};
    const Stru = window.Stru;

    const getRoute = () => {
        const hash = window.location.hash || "#/home";
        return hash.replace("#", "");
    };

    const listeners = new Set();

    const notify = () => {
        const route = getRoute();
        listeners.forEach((fn) => fn(route));
    };

    window.addEventListener("hashchange", notify);

    const go = (path) => {
        window.location.hash = path;
    };

    const Router = () => {
        React.useEffect(() => {
            notify();
        }, []);
        return null;
    };

    const useRoute = () => {
        const [route, setRoute] = React.useState(getRoute());

        React.useEffect(() => {
            const handler = (r) => setRoute(r);
            listeners.add(handler);
            return () => listeners.delete(handler);
        }, []);

        return route;
    };

    Stru.router = {
        Router,
        useRoute,
        go,
    };
})();
