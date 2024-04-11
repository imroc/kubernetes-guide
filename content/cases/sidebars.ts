import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  casesSidebar: [
    'README',
    {
      type: 'category',
      label: '云原生家庭网络',
      collapsed: false,
      customProps: {

      },
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
        'home-network/homepage',
      ]
    },
  ],
};

export default sidebars;
