const aboutPage = {
  name: 'aboutPage',
  title: 'About Page',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title H1',
      type: 'string',
    },
    {
      name: 'subheadingOne',
      title: 'Sub Heading One H2',
      type: 'string',
    },
    {
      name: 'mainImage',
      title: 'Main Image',
      type: 'image',
    },
    {
      name: 'paragraphOne',
      title: 'Paragraph One',
      type: 'text',
    },
    {
      name: 'subheadingTwo',
      title: 'Sub Heading Two H2',
      type: 'string',
    },
    {
      name: 'paragraphTwo',
      title: 'Paragraph Two',
      type: 'text',
    },
    {
      name: 'subheadingThree',
      title: 'Sub Heading Three H2',
      type: 'string',
    },
    {
      name: 'paragraphThree',
      title: 'Paragraph Three',
      type: 'text',
    },

    {
      name: 'teamMembers',
      title: 'Team Members',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'teamMember',
          title: 'Team Member',
          fields: [
            {
              name: 'name',
              title: 'Name',
              type: 'string',
            },
            {
              name: 'role',
              title: 'Role',
              type: 'string',
            },
            {
              name: 'image',
              title: 'Image',
              type: 'image',
            },
            {
              name: 'bio',
              title: 'Bio',
              type: 'text',
            },
          ],
        },
      ],
    },
  ],
};

export default aboutPage;
