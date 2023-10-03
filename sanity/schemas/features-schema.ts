const featuresPage = {
  name: 'featuresPage',
  title: 'Features Page',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
    },
    {
      name: 'SubTitle',
      title: 'Sub Title',
      type: 'string',
    },
    {
      name: 'SubheadingOne',
      title: 'Subheading One',
      type: 'string',
    },
    {
      name: 'SubheadingOneA',
      title: 'Subheading One A',
      type: 'string',
    },
    {
      name: 'howItWorks',
      title: 'How It Works',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'step',
          title: 'Step',
          fields: [
            {
              name: 'stepTitle',
              title: 'Step Title',
              type: 'string',
            },
            {
              name: 'stepDescription',
              title: 'Step Description',
              type: 'text',
            },
          ],
        },
      ],
    },
    {
      name: 'SubheadingTwo',
      title: 'Subheading Two',
      type: 'string',
    },
    {
      name: 'features',
      title: 'Features',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'feature',
          title: 'Feature',
          fields: [
            {
              name: 'featureTitle',
              title: 'Feature Title',
              type: 'string',
            },
            {
              name: 'featureDescription',
              title: 'Feature Description',
              type: 'text',
            },
          ],
        },
      ],
    },
    {
      name: 'SubheadingThree',
      title: 'Subheading Three',
      type: 'string',
    },
    {
      name: 'useCases',
      title: 'Use Cases',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'useCase',
          title: 'Use Case',
          fields: [
            {
              name: 'useCaseTitle',
              title: 'Use Case Title',
              type: 'string',
            },
            {
              name: 'useCaseDescription',
              title: 'Use Case Description',
              type: 'text',
            },
          ],
        },
      ],
    },
  ],
};

export default featuresPage;
