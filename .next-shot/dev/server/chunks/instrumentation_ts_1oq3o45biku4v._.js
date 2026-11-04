module.exports = [
"[project]/instrumentation.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "onRequestError",
    ()=>onRequestError
]);
const AREAS = {
    render: "Visning av side",
    route: "API",
    action: "Handling",
    proxy: "Proxy"
};
const onRequestError = async (err, _request, context)=>{
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const digest = err.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_")) return;
    const { reportError } = await __turbopack_context__.A("[project]/lib/errors.ts [instrumentation] (ecmascript, async loader)");
    await reportError(AREAS[context.routeType] ?? "Forespørsel", err, {
        route: context.routePath
    });
};
}),
];

//# sourceMappingURL=instrumentation_ts_1oq3o45biku4v._.js.map