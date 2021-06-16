# jellyfish

## generate
> [Katapult](https://github.com/product-os/katapult#usage)

    sed "s/#JF_VERSION#/$(git describe)/g" keyframe.tpl.yml > jellyfish-product/product/keyframe.yml

    katapult generate \
      --environmentPath=jellyfish-product \
      --target=kubernetes \
      --keyframe=jellyfish-product/product/keyframe.yml \
      --outputPath=jellyfish-product/product/deploy
