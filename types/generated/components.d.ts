import type { Schema, Struct } from '@strapi/strapi';

export interface ComponentsContact extends Struct.ComponentSchema {
  collectionName: 'components_components_contacts';
  info: {
    displayName: 'Contact';
    icon: 'phone';
  };
  attributes: {
    address: Schema.Attribute.String;
    email: Schema.Attribute.Email;
    extra: Schema.Attribute.Text;
    phone: Schema.Attribute.String;
  };
}

export interface ComponentsHeader extends Struct.ComponentSchema {
  collectionName: 'components_components_headers';
  info: {
    displayName: 'Header';
    icon: 'file';
  };
  attributes: {
    image: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SectionComponentsAccordionSection
  extends Struct.ComponentSchema {
  collectionName: 'components_section_components_accordion_sections';
  info: {
    displayName: 'AccordionSection';
    icon: 'stack';
  };
  attributes: {
    collapsibles: Schema.Attribute.Component<
      'section-components.section',
      true
    >;
    title: Schema.Attribute.String;
  };
}

export interface SectionComponentsCarousel extends Struct.ComponentSchema {
  collectionName: 'components_section_components_carousels';
  info: {
    displayName: 'Carousel';
    icon: 'landscape';
  };
  attributes: {
    images: Schema.Attribute.Media<'images', true> & Schema.Attribute.Required;
    title: Schema.Attribute.String;
  };
}

export interface SectionComponentsSection extends Struct.ComponentSchema {
  collectionName: 'components_section_components_sections';
  info: {
    displayName: 'Section';
    icon: 'picture';
  };
  attributes: {
    description: Schema.Attribute.Text;
    design: Schema.Attribute.Enumeration<['top', 'right', 'bottom', 'left']> &
      Schema.Attribute.DefaultTo<'top'>;
    image: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'components.contact': ComponentsContact;
      'components.header': ComponentsHeader;
      'section-components.accordion-section': SectionComponentsAccordionSection;
      'section-components.carousel': SectionComponentsCarousel;
      'section-components.section': SectionComponentsSection;
    }
  }
}
