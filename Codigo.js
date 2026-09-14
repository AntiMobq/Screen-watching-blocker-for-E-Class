(function () {
    console.log("Interceptor do Detector de Tela");

    console.log("Made By: União flasco");

    const TARGET = "/tentativa/store-exit-tracking";

    function isTarget(url) {
        return String(url || "").includes(TARGET);
    }

    function getType(body) {
        if (!body) return null;

        // String
        if (typeof body === "string") {
            try {
                const json = JSON.parse(body);
                return json?.type ?? null;
            } catch {}

            try {
                return new URLSearchParams(body).get("type");
            } catch {}
        }

        // URLSearchParams
        if (body instanceof URLSearchParams) {
            return body.get("type");
        }

        // Blob
        if (body instanceof Blob) {
            return null;
        }

        // FormData
        if (body instanceof FormData) {
            return body.get("type");
        }

        // Objeto
        if (typeof body === "object") {
            return body?.type ?? null;
        }

        return null;
    }

    function shouldBlock(url, body) {
        if (!isTarget(url)) {
            return false;
        }

        const type = getType(body);

        if (type === "screen_switching") {
            console.warn(
                `🚫 BLOQUEADO: ${url} | type=${type}`
            );
            return true;
        }

        console.log(
            `✅ PERMITIDO: ${url} | type=${type}`
        );

        return false;
    }

    // FETCH

    const originalFetch = window.fetch;

    window.fetch = async function (...args) {
        const [resource, config] = args;

        const url = typeof resource === "string"
            ? resource
            : resource?.url;

        const method =
            config?.method ||
            (typeof resource !== "string"
                ? resource?.method
                : "GET");

        const body = config?.body;

        if (
            method?.toUpperCase() === "POST" &&
            isTarget(url)
        ) {
            const type = getType(body);

            if (type === "screen_switching") {
                console.warn(
                    `🚫 FETCH bloqueado: ${url} | type=${type}`
                );

                return new Response(
                    JSON.stringify({
                        blocked: true,
                        type: "screen_switching"
                    }),
                    {
                        status: 200,
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                );
            }

            console.log(
                `✅ FETCH permitido: ${url} | type=${type}`
            );
        }

        return originalFetch.apply(this, args);
    };
    
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (
        method,
        url,
        ...args
    ) {
        this._interceptorMethod = method;
        this._interceptorUrl = url;

        return originalOpen.call(
            this,
            method,
            url,
            ...args
        );
    };

    XMLHttpRequest.prototype.send = function (body) {
        const method = this._interceptorMethod;
        const url = this._interceptorUrl;

        if (
            method?.toUpperCase() === "POST" &&
            isTarget(url)
        ) {
            const type = getType(body);

            if (type === "screen_switching") {
                console.warn(
                    `🚫 XHR bloqueado: ${url} | type=${type}`
                );
                return;
            }

            console.log(
                `✅ XHR permitido: ${url} | type=${type}`
            );
        }

        return originalSend.apply(this, arguments);
    };


    // navigator.sendBeacon

    if (navigator.sendBeacon) {
        const originalSendBeacon = navigator.sendBeacon.bind(navigator);

        navigator.sendBeacon = function (url, data) {
            if (isTarget(url)) {
                const type = getType(data);

                if (type === "screen_switching") {
                    console.warn(
                        `🚫 BEACON bloqueado: ${url} | type=${type}`
                    );

                    return true;
                }

                if (type !== null) {
                    console.log(
                        `✅ BEACON permitido: ${url} | type=${type}`
                    );
                }
            }

            return originalSendBeacon(url, data);
        };
    }
})();
