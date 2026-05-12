-- =============================================================================
-- Jeremy Atelier — replace demo imagery with Pixabay URLs
-- Keeps existing catalog content while moving all storefront image fields away
-- from non-Pixabay demo assets.
-- =============================================================================

update public.categories as c
set image_url = v.image_url
from (
    values
        ('hoodies',     'https://cdn.pixabay.com/photo/2016/09/10/01/24/urban-1658436_1280.jpg'),
        ('t-shirts',    'https://cdn.pixabay.com/photo/2020/08/26/14/02/girl-5519558_1280.jpg'),
        ('jackets',     'https://cdn.pixabay.com/photo/2016/11/18/17/08/fashion-1835871_1280.jpg'),
        ('sneakers',    'https://cdn.pixabay.com/photo/2019/09/26/05/28/shoes-4505142_1280.jpg'),
        ('accessories', 'https://cdn.pixabay.com/photo/2016/11/18/19/39/backpack-1836594_1280.jpg')
) as v(slug, image_url)
where c.slug = v.slug;

update public.products as p
set image_url = v.image_url,
    gallery_images = v.gallery_images
from (
    values
        ('arc-mono-hoodie',
         'https://cdn.pixabay.com/photo/2016/09/10/01/24/urban-1658436_1280.jpg',
         array['https://cdn.pixabay.com/photo/2014/11/03/17/50/man-515518_1280.jpg']),
        ('linear-zip-hoodie',
         'https://cdn.pixabay.com/photo/2020/11/06/06/24/black-5716973_1280.jpg',
         array['https://cdn.pixabay.com/photo/2022/02/07/22/04/man-7000371_1280.jpg']),
        ('velour-crew-hoodie',
         'https://cdn.pixabay.com/photo/2015/08/03/17/46/model-873681_1280.jpg',
         array['https://cdn.pixabay.com/photo/2021/07/15/11/15/woman-6468147_640.jpg']),
        ('oversized-stamp-tee',
         'https://cdn.pixabay.com/photo/2020/08/26/14/02/girl-5519558_1280.jpg',
         array['https://cdn.pixabay.com/photo/2020/10/19/09/44/woman-5667299_640.jpg']),
        ('signal-longline-tee',
         'https://cdn.pixabay.com/photo/2014/11/03/17/50/man-515518_1280.jpg',
         array['https://cdn.pixabay.com/photo/2020/11/06/06/24/black-5716973_1280.jpg']),
        ('contour-rib-tee',
         'https://cdn.pixabay.com/photo/2023/09/14/15/48/woman-8253239_1280.jpg',
         array['https://cdn.pixabay.com/photo/2018/07/28/09/23/woman-3567600_1280.jpg']),
        ('mercer-pocket-tee',
         'https://cdn.pixabay.com/photo/2021/06/26/00/26/fashion-6364998_640.jpg',
         array['https://cdn.pixabay.com/photo/2021/09/15/12/34/woman-6626742_640.jpg']),
        ('field-shell-jacket',
         'https://cdn.pixabay.com/photo/2016/11/18/17/08/fashion-1835871_1280.jpg',
         array['https://cdn.pixabay.com/photo/2017/03/27/13/28/man-2178721_640.jpg']),
        ('pleated-wool-blazer',
         'https://cdn.pixabay.com/photo/2018/05/11/16/18/man-3390927_1280.jpg',
         array['https://cdn.pixabay.com/photo/2015/06/20/13/55/man-815795_1280.jpg']),
        ('quilt-liner-jacket',
         'https://cdn.pixabay.com/photo/2024/11/27/07/51/woman-9227532_1280.jpg',
         array['https://cdn.pixabay.com/photo/2021/07/15/11/15/woman-6468147_640.jpg']),
        ('trace-leather-jacket',
         'https://cdn.pixabay.com/photo/2015/08/03/17/46/model-873681_1280.jpg',
         array['https://cdn.pixabay.com/photo/2024/11/27/07/51/woman-9227532_1280.jpg']),
        ('obsidian-runner',
         'https://cdn.pixabay.com/photo/2019/09/26/05/28/shoes-4505142_1280.jpg',
         array['https://cdn.pixabay.com/photo/2019/07/18/07/04/shoes-4345636_1280.jpg']),
        ('velocity-court',
         'https://cdn.pixabay.com/photo/2020/08/24/21/40/fashion-5515135_640.jpg',
         array['https://cdn.pixabay.com/photo/2022/03/31/19/45/shoes-7103597_640.jpg']),
        ('monolith-high',
         'https://cdn.pixabay.com/photo/2019/07/18/07/04/shoes-4345636_1280.jpg',
         array['https://cdn.pixabay.com/photo/2016/06/03/17/35/shoes-1433925_640.jpg']),
        ('trace-slip-on',
         'https://cdn.pixabay.com/photo/2022/03/31/19/45/shoes-7103597_640.jpg',
         array['https://cdn.pixabay.com/photo/2019/12/01/18/04/legs-4666061_640.jpg']),
        ('leather-crossbody',
         'https://cdn.pixabay.com/photo/2016/11/18/19/39/backpack-1836594_1280.jpg',
         array['https://cdn.pixabay.com/photo/2016/11/23/18/12/bag-1854148_640.jpg']),
        ('silver-link-bracelet',
         'https://cdn.pixabay.com/photo/2016/11/23/18/12/bag-1854148_640.jpg',
         array['https://cdn.pixabay.com/photo/2016/11/18/19/39/backpack-1836594_1280.jpg']),
        ('technical-cap',
         'https://cdn.pixabay.com/photo/2022/02/07/22/04/man-7000371_1280.jpg',
         array['https://cdn.pixabay.com/photo/2014/11/03/17/50/man-515518_1280.jpg']),
        ('merino-beanie',
         'https://cdn.pixabay.com/photo/2017/08/01/01/33/beanie-2562646_640.jpg',
         array['https://cdn.pixabay.com/photo/2018/05/11/16/18/man-3390927_1280.jpg']),
        ('monolith-tote',
         'https://cdn.pixabay.com/photo/2016/11/18/19/39/backpack-1836594_1280.jpg',
         array['https://cdn.pixabay.com/photo/2016/11/23/18/12/bag-1854148_640.jpg']),
        ('shadow-hoodie',
         'https://cdn.pixabay.com/photo/2014/11/03/17/50/man-515518_1280.jpg',
         array['https://cdn.pixabay.com/photo/2016/09/10/01/24/urban-1658436_1280.jpg']),
        ('studio-tank',
         'https://cdn.pixabay.com/photo/2020/08/26/14/02/girl-5519558_1280.jpg',
         array['https://cdn.pixabay.com/photo/2017/08/06/15/13/woman-2593366_640.jpg']),
        ('denim-trucker-jacket',
         'https://cdn.pixabay.com/photo/2017/08/01/11/48/woman-2564660_640.jpg',
         array['https://cdn.pixabay.com/photo/2017/03/27/13/28/man-2178721_640.jpg']),
        ('echo-low-sneaker',
         'https://cdn.pixabay.com/photo/2019/09/26/05/28/shoes-4505142_1280.jpg',
         array['https://cdn.pixabay.com/photo/2022/03/31/19/45/shoes-7103597_640.jpg'])
) as v(slug, image_url, gallery_images)
where p.slug = v.slug;
