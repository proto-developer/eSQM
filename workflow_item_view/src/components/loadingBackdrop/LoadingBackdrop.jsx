import { Loader } from "monday-ui-react-core";

const LoadingBackdrop = () => {
  return (
    <div
      className={`h-screen w-screen fixed top-0 left-0 z-[1300] flex justify-center items-center bg-white`}
    >
      <Loader size={40} color={Loader.colors.PRIMARY} />
    </div>
  );
};

export default LoadingBackdrop;
