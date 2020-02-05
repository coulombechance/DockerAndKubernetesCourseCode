"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const k8s = require("@kubernetes/client-node");
const Table = require("easy-table");
const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const appsV1Api = kc.makeApiClient(k8s.AppsV1Api);
const coreV1Api = kc.makeApiClient(k8s.CoreV1Api);
const roles = ['blue', 'green'];
appsV1Api.listNamespacedDeployment('default').then(res => {
    let deployments = [];
    for (const deployment of res.body.items) {
        let role = deployment.spec.template.metadata.labels.role;
        if (role && roles.includes(role)) {
            deployments.push({
                name: deployment.metadata.name,
                role,
                status: deployment.status.conditions[0].status,
                image: deployment.spec.template.spec.containers[0].image,
                ports: [],
                services: []
            });
        }
    }
    return deployments;
})
    .then(deployments => {
    coreV1Api.listNamespacedService('default').then(res => {
        for (const service of res.body.items) {
            if (service.spec.selector && service.spec.selector.role && roles.includes(service.spec.selector.role)) {
                let filteredDeployments = deployments.filter(d => {
                    return d.role === service.spec.selector.role;
                });
                if (filteredDeployments) {
                    for (const d of filteredDeployments) {
                        d.ports.push(service.spec.ports[0].port);
                        d.services.push(service.metadata.name);
                    }
                }
            }
        }
        renderTable(deployments);
    });
});
function renderTable(data, showHeader = true) {
    const table = new Table();
    for (const d of data) {
        d.services.sort();
        d.ports.sort();
        table.cell('Deployment', d.name);
        table.cell('Role', d.role);
        table.cell('Status', d.status ? 'running' : 'stopped');
        table.cell('Image', d.image);
        table.cell('Ports', d.ports.join(', '));
        table.cell('Services', d.services.join(', '));
        table.newRow();
    }
    ;
    table.sort(['Role|asc']);
    if (showHeader) {
        console.log(table.toString());
    }
    else {
        console.log(table.print());
    }
}
function filterByRole(deployments, role) {
    return deployments.filter(d => d.role === role);
}
//# sourceMappingURL=dashboard.js.map