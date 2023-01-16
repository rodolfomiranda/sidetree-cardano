with (import <nixpkgs> {});
let

  project = pkgs.callPackage ./yarn-project.nix {

    # Example of selecting a specific version of Node.js.
    nodejs = pkgs.nodejs;

  } {

    # Example of providing a different source tree.
    src = pkgs.lib.cleanSource ./.;

  };

in project.overrideAttrs (oldAttrs: {

  # If your top-level package.json doesn't set a name, you can set one here.
  name = "sidetree-cardano";

  # Example of adding packages to the build environment.
  # Especially dependencies with native modules may need a Python installation.
  buildInputs = oldAttrs.buildInputs ++ [ pkgs.typescript ];

  # Example of invoking a build step in your project.
  buildPhase = ''
    yarn build
  '';

})
