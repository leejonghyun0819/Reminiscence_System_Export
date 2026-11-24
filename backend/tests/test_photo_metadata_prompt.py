from prompts.gemini_prompts import (
    INTERVIEW_GENERATION_PROMPT,
    build_new_interview_user_prompt,
)


def test_interview_prompt_includes_photo_metadata_as_secondary_clue() -> None:
    prompt = build_new_interview_user_prompt(
        total_count=2,
        clues_summary="사진 1: 세 사람이 야외에 있음",
        memory_mode="childhood",
        provided_photo_indexes=[1, 2],
        memory_context={
            "approximateTime": "2010년대",
            "placeHint": "서울 근교",
        },
        photo_metadata=[
            {
                "photoIndex": 1,
                "capturedAt": "2012-05-06T14:30:00+09:00",
                "location": {
                    "latitude": 37.555,
                    "longitude": 126.97806,
                    "source": "exif",
                },
            }
        ],
    )

    assert '"photoIndex": 1' in prompt
    assert '"capturedAt": "2012-05-06T14:30:00+09:00"' in prompt
    assert '"latitude": 37.555' in prompt
    assert "입력된 사용자 맥락은 사진 추정과 촬영 메타데이터보다 우선" in prompt


def test_interview_prompt_handles_missing_metadata() -> None:
    prompt = build_new_interview_user_prompt(
        total_count=1,
        clues_summary="단서 없음",
        memory_mode="travel",
        provided_photo_indexes=[1],
        memory_context={},
        photo_metadata=[],
    )

    assert "확인 가능한 촬영 메타데이터 없음" in prompt


def test_system_prompt_prevents_metadata_overclaiming() -> None:
    assert "카메라 시계가 잘못 설정되었거나 GPS가 부정확할 수" in INTERVIEW_GENERATION_PROMPT
    assert "원시 GPS 좌표를 질문에 그대로 노출하지 말고" in INTERVIEW_GENERATION_PROMPT
    assert "집, 직장 또는 사적인 장소라고 추측하지 마세요" in INTERVIEW_GENERATION_PROMPT
