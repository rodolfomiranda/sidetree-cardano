with (import <nixpkgs> {});
let
  # project = pkgs.callPackage ./yarn-project.nix {
  # Example of selecting a specific version of Node.js.
  nodejs = pkgs.nodejs;
  yarn = pkgs.yarn.override { inherit nodejs; };

  # } {
  # Example of providing a different source tree.
  #  src = pkgs.lib.cleanSource ./.;
  # };

in pkgs.mkShell {

  # If your top-level package.json doesn't set a name, you can set one here.
  # name = "sidetree-cardano";

  # Example of adding packages to the build environment.
  # Especially dependencies with native modules may need a Python installation.
  buildInputs = [ 
    nodejs
    yarn
    pkgs.typescript
    pkgs.nodePackages.typescript
    pkgs.nodePackages.typescript-language-server   
  ];

  # Example of invoking a build step in your project.
  shellHook = ''
    yarn set version berry

  '';

}
