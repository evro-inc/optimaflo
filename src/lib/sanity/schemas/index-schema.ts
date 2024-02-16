const index = {
  name: 'homePage',
  title: 'Home Page',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
    },
    {
      name: 'spanTitle',
      title: 'Span Title',
      type: 'string',
    },
    {
      name: 'subtitle',
      title: 'Subtitle',
      type: 'string',
    },
    {
      name: 'headerImage',
      title: 'Header Image',
      type: 'image',
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alternative Text',
          options: {
            isHighlighted: true,
          },
        },
      ],
    },
    {
      name: 'oneLiner',
      title: 'One Liner',
      type: 'string',
    },
    {
      name: 'oneLinerDescription',
      title: 'One Liner Description',
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
            {
              name: 'featureImage',
              title: 'Feature Image',
              type: 'image',
              fields: [
                {
                  name: 'alt',
                  type: 'string',
                  title: 'Alternative Text',
                  options: {
                    isHighlighted: true,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    //HOW IT WORKS
    {
      name: 'howItWorks',
      title: 'How It Works',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'howItWorks',
          title: 'How It Works',
          fields: [
            {
              name: 'title',
              title: 'Title',
              type: 'string',
            },
            {
              name: 'description',
              title: 'Description',
              type: 'text',
            },
            {
              name: 'image',
              title: 'Image',
              type: 'image',
              fields: [
                {
                  name: 'alt',
                  type: 'string',
                  title: 'Alternative Text',
                  options: {
                    isHighlighted: true,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    //FAQ
    {
      name: 'faq',
      title: 'FAQ',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'faq',
          title: 'FAQ',
          fields: [
            {
              name: 'question',
              title: 'Question',
              type: 'string',
            },
            {
              name: 'answer',
              title: 'Answer',
              type: 'text',
            },
          ],
        },
      ],
    },
    {
      name: 'ctaTitle',
      title: 'Call to Action Title',
      type: 'string',
    },
    {
      name: 'ctaDescription',
      title: 'Call to Action Description',
      type: 'text',
    },
    // SEO fields
    {
      name: 'seoTitle',
      title: 'SEO Title',
      type: 'string',
      description:
        'This is the title users see in their search engine results. Keep it under 60 characters.',
    },
    {
      name: 'seoDescription',
      title: 'SEO Description',
      type: 'text',
      description:
        'This is the description users see in their search engine results. Keep it under 155 characters.',
    },
    {
      name: 'keywords',
      title: 'Keywords',
      type: 'array',
      of: [{ type: 'string' }],
      description:
        'These are the keywords for search engines to understand the content of the page.',
    },
    {
      name: 'canonicalUrl',
      title: 'Canonical URL',
      type: 'url',
      description:
        'This is the canonical URL of the page, used to prevent duplicate content issues.',
    },
    {
      name: 'socialImage',
      title: 'Social Share Image',
      type: 'image',
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alternative Text',
          options: {
            isHighlighted: true,
          },
        },
      ],
      description: 'This image will be used when the page is shared on social media platforms.',
    },
    {
      name: 'socialTitle',
      title: 'Social Share Title',
      type: 'string',
      description: 'This title will be used when the page is shared on social media platforms.',
    },
    {
      name: 'socialDescription',
      title: 'Social Share Description',
      type: 'text',
      description:
        'This description will be used when the page is shared on social media platforms.',
    },
  ],
};

export default index;
