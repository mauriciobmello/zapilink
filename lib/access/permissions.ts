import type { Permission } from "@/types/access";

/**
 * Verifica se um conjunto de permissões inclui uma permissão específica
 */
export function hasPermission(
  permissions: Permission[],
  required: Permission
): boolean {
  return permissions.includes(required);
}

/**
 * Verifica se o usuário tem qualquer uma das permissões necessárias
 */
export function hasAnyPermission(
  permissions: Permission[],
  required: Permission[]
): boolean {
  return required.some((perm) => permissions.includes(perm));
}

/**
 * Verifica se o usuário tem todas as permissões necessárias
 */
export function hasAllPermissions(
  permissions: Permission[],
  required: Permission[]
): boolean {
  return required.every((perm) => permissions.includes(perm));
}

/**
 * Agrupa permissões por categoria para facilitar a UI
 */
export function groupPermissions(permissions: Permission[]) {
  return {
    profile: permissions.filter((p) => p.startsWith("profile.")),
    theme: permissions.filter((p) => p.startsWith("theme.")),
    social: permissions.filter((p) => p.startsWith("social_links.")),
    blocks: permissions.filter((p) => p.startsWith("blocks.")),
    schedule: permissions.filter((p) => p.startsWith("schedule.")),
    bookings: permissions.filter((p) => p.startsWith("bookings.")),
    loyalty: permissions.filter((p) => p.startsWith("loyalty.")),
    page: permissions.filter((p) => p.startsWith("page.")),
    crm: permissions.filter((p) => p.startsWith("crm.")),
  };
}

/**
 * Obtém permissões padrão para um determinado "role" predefinido
 */
export function getDefaultPermissions(role: "editor" | "content" | "full"): Permission[] {
  const allPermissions: Permission[] = [
    "profile.view",
    "profile.edit",
    "theme.edit",
    "social_links.edit",
    "blocks.view",
    "blocks.edit",
    "schedule.view",
    "schedule.edit",
    "bookings.view",
    "bookings.manage",
    "loyalty.view",
    "loyalty.customers.view",
    "loyalty.customers.manage",
    "loyalty.stars.add",
    "loyalty.stars.reverse",
    "loyalty.benefits.view",
    "loyalty.benefits.redeem",
    "loyalty.settings.edit",
    "page.publish",
    "crm.view",
    "crm.create",
    "crm.update",
    "crm.delete",
    "crm.export",
    "crm.import",
    "crm.tags.manage",
    "crm.segments.manage",
  ];

  switch (role) {
    case "editor":
      return [
        "profile.view",
        "profile.edit",
        "theme.edit",
        "social_links.edit",
        "blocks.view",
        "blocks.edit",
      ];
    case "content":
      return [
        "profile.view",
        "profile.edit",
        "social_links.edit",
        "blocks.view",
        "blocks.edit",
      ];
    case "full":
      return allPermissions;
    default:
      return [];
  }
}

/**
 * Lista todas as permissões disponíveis com descrições
 */
export function getAllPermissions(): Record<string, { label: string; description: string }> {
  return {
    "profile.view": {
      label: "Visualizar perfil",
      description: "Permite visualizar dados da página no dashboard",
    },
    "profile.edit": {
      label: "Editar perfil",
      description: "Permite editar nome, descrição, foto e informações básicas",
    },
    "theme.edit": {
      label: "Editar tema",
      description: "Permite alterar cores e tema",
    },
    "social_links.edit": {
      label: "Editar links sociais",
      description: "Permite alterar links sociais",
    },
    "blocks.view": {
      label: "Visualizar blocos",
      description: "Permite visualizar blocos",
    },
    "blocks.edit": {
      label: "Editar blocos",
      description: "Permite criar, editar, ocultar, excluir e ordenar blocos",
    },
    "schedule.view": {
      label: "Visualizar agenda",
      description: "Permite visualizar configuração da agenda",
    },
    "schedule.edit": {
      label: "Editar agenda",
      description: "Permite administrar configurações da agenda",
    },
    "bookings.view": {
      label: "Visualizar agendamentos",
      description: "Permite visualizar solicitações/agendamentos",
    },
    "bookings.manage": {
      label: "Gerenciar agendamentos",
      description: "Permite aprovar/recusar agendamentos",
    },
    "loyalty.view": {
      label: "Visualizar fidelidade",
      description: "Permite visualizar o programa de fidelidade",
    },
    "loyalty.customers.view": {
      label: "Visualizar clientes",
      description: "Permite visualizar clientes do programa de fidelidade",
    },
    "loyalty.customers.manage": {
      label: "Gerenciar clientes",
      description: "Permite cadastrar e editar clientes do programa",
    },
    "loyalty.stars.add": {
      label: "Lançar estrelas",
      description: "Permite lançar uma estrela por atendimento",
    },
    "loyalty.stars.reverse": {
      label: "Estornar estrelas",
      description: "Permite estornar estrelas lançadas por engano",
    },
    "loyalty.benefits.view": {
      label: "Visualizar benefícios",
      description: "Permite visualizar benefícios disponíveis e resgatados",
    },
    "loyalty.benefits.redeem": {
      label: "Registrar resgates",
      description: "Permite registrar o resgate do benefício",
    },
    "loyalty.settings.edit": {
      label: "Configurar fidelidade",
      description: "Permite configurar meta, benefício e ativação do programa",
    },
    "page.publish": {
      label: "Publicar página",
      description: "Permite publicar alterações",
    },
    "crm.view": {
      label: "Visualizar CRM",
      description: "Permite acessar a lista e o perfil dos clientes",
    },
    "crm.create": {
      label: "Cadastrar clientes",
      description: "Permite criar novos clientes",
    },
    "crm.update": {
      label: "Editar clientes",
      description: "Permite editar dados e tags dos clientes",
    },
    "crm.delete": {
      label: "Excluir/inativar clientes",
      description: "Permite inativar ou arquivar clientes",
    },
    "crm.export": {
      label: "Exportar clientes",
      description: "Permite exportar a base em CSV",
    },
    "crm.import": {
      label: "Importar clientes",
      description: "Permite importar clientes via CSV",
    },
    "crm.tags.manage": {
      label: "Gerenciar tags",
      description: "Permite criar, editar e excluir tags",
    },
    "crm.segments.manage": {
      label: "Gerenciar segmentos",
      description: "Permite criar, editar e excluir segmentos",
    },
  };
}
