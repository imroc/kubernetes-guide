import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  casesSidebar: [
    'README',
    {
      type: 'category',
      label: '云原生家庭网络',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/home-network'
      },
      items: [
        'home-network/intro',
        'home-network/network-config',
        'home-network/prepare',
        'home-network/dnsmasq',
        'home-network/radvd',
        'home-network/ddns',
        'home-network/ikev2',
        'home-network/nfs',
        'home-network/samba',
        'home-network/aria2',
        'home-network/alist',
        'home-network/filebrowser',
        'home-network/jellyfin',
        'home-network/home-assistant',
        'home-network/monitoring',
        'home-network/homepage',
        'home-network/tproxy',
        'home-network/containerized-nftables',
        'home-network/gitops',
      ]
    },
    'llama3',
    {
      type: 'category',
      label: 'ArgoCD GitOps 实践',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/argocd'
      },
      items: [
        'argocd/install',
        'argocd/cluster-and-repo',
        'argocd/project',
      ]
    },
    {
      type: 'category',
      label: '打造超级富容器开发环境',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/devcontainer'
      },
      items: [
        'devcontainer/overview',
        'devcontainer/host',
        'devcontainer/dockerfile',
        'devcontainer/deploy',
        'devcontainer/packages',
        'devcontainer/ssh',
        'devcontainer/lang',
        'devcontainer/other',
        'devcontainer/dind',
        'devcontainer/sync-config',
      ]
    },
  ],
};

export default sidebars;
